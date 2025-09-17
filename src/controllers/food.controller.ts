import { Request, Response } from 'express';
import { foodModel } from '../models/food.model';
import { likeModel } from '../models/likes.model';
import { saveModel } from '../models/save.model';
import { viewModel } from '../models/view.model';
import { VideoStreamService } from '../services/video-stream.service';

const createFood = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate required fields
        const { name, description, restaurantAddress, tags, duration } = req.body;

        if (!name || !description || !restaurantAddress) {
            res.status(400).json({
                message: "Name, description, and restaurant address are required"
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({
                message: "Video file is required"
            });
            return;
        }

        // Validate file type
        const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            res.status(400).json({
                message: "Invalid file type. Only video files are allowed."
            });
            return;
        }

        // Upload video to ImageKit for streaming (this is now our only upload method)
        console.log('Uploading video to ImageKit for streaming...');
        const videoUploadResult = await VideoStreamService.uploadVideo(req.file);

        const foodItem = await foodModel.create({
            name,
            description,
            restaurantAddress,
            video: videoUploadResult.url, // Use ImageKit URL directly
            hlsVideo: videoUploadResult.url, // Same as video for consistency
            lessonId: videoUploadResult.fileId, // Use ImageKit fileId
            foodPartner: req.foodPartner._id,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((tag: string) => tag.trim())) : [],
            duration: duration || 0
        });

        res.status(201).json({
            message: "Reel created successfully",
            food: foodItem
        });
    } catch (error) {
        console.error('Create food error:', error);
        res.status(500).json({
            message: "Error creating reel",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

const getFoodItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Get total count first
        const total = await foodModel.countDocuments({ isActive: true });

        // Enhanced randomization using client timestamp
        const clientTimestamp = parseInt(req.query._t as string) || 0;

        // Create multiple randomization factors for better distribution
        const baseRandomSeed = clientTimestamp || Date.now();
        const pageRandomizer = page * 7919; // Prime number
        const timeRandomizer = Math.floor(baseRandomSeed / 1000) * 31; // Another prime
        const microRandomizer = (baseRandomSeed % 1000) * 97; // Third prime

        console.log(`Fetching random videos - Page: ${page}, Timestamp: ${clientTimestamp}, Total: ${total}`);

        const foodItems = await foodModel.aggregate([
            { $match: { isActive: true } },
            {
                $addFields: {
                    // Simplified randomization using $rand() and basic fields
                    randomField: {
                        $add: [
                            { $multiply: [{ $rand: {} }, 1000000] }, // True random component
                            baseRandomSeed, // Client timestamp
                            pageRandomizer, // Page factor
                            timeRandomizer // Time factor
                        ]
                    }
                }
            },
            { $sort: { randomField: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'foodpartners',
                    localField: 'foodPartner',
                    foreignField: '_id',
                    as: 'foodPartner'
                }
            },
            {
                $unwind: '$foodPartner'
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    restaurantAddress: 1,
                    video: 1,
                    thumbnail: 1,
                    tags: 1,
                    duration: 1,
                    viewsCount: 1,
                    likeCount: 1,
                    commentsCount: 1,
                    savesCount: 1,
                    isActive: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'foodPartner._id': 1,
                    'foodPartner.name': 1
                }
            }
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNext = skip + foodItems.length < total;

        res.status(200).json({
            message: "Food items fetched successfully",
            foods: foodItems,
            pagination: {
                currentPage: page,
                totalPages,
                totalFoods: total,
                hasNext
            }
        })
    } catch (error) {
        res.status(500).json({
            message: "Error fetching food items",
            error: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

const likeFood = async (req: Request, res: Response): Promise<void> => {
    try {
        const { foodId } = req.body
        const user = req.user

        // Validate input
        if (!foodId) {
            res.status(400).json({
                message: "foodId is required"
            })
            return
        }

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            })
            return
        }

        // Check if food exists
        const foodExists = await foodModel.findById(foodId)
        if (!foodExists) {
            res.status(404).json({
                message: "Food item not found"
            })
            return
        }

        const isAlreadyLiked = await likeModel.findOne({
            user: user._id,
            food: foodId
        })

        if (isAlreadyLiked) {
            await likeModel.deleteOne({
                user: user._id,
                food: foodId
            })

            await foodModel.findByIdAndUpdate(foodId, {
                $inc: { likeCount: -1 }
            })

            res.status(200).json({
                message: "Food unliked successfully",
                isLiked: false
            })
            return
        }

        const like = await likeModel.create({
            user: user._id,
            food: foodId
        })

        await foodModel.findByIdAndUpdate(foodId, {
            $inc: { likeCount: 1 }
        })

        res.status(201).json({
            message: 'Food liked successfully',
            isLiked: true,
            data: like
        })
    } catch (error) {
        console.error('Like food error:', error);
        res.status(500).json({
            message: "Error processing like",
            error: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

const saveFood = async (req: Request, res: Response): Promise<void> => {
    try {
        const { foodId } = req.body
        const user = req.user

        // Validate input
        if (!foodId) {
            res.status(400).json({
                message: "foodId is required"
            })
            return
        }

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            })
            return
        }

        // Check if food exists
        const foodExists = await foodModel.findById(foodId)
        if (!foodExists) {
            res.status(404).json({
                message: "Food item not found"
            })
            return
        }

        const isAlreadySaved = await saveModel.findOne({
            user: user._id,
            food: foodId
        })

        if (isAlreadySaved) {
            await saveModel.deleteOne({
                user: user._id,
                food: foodId
            })

            await foodModel.findByIdAndUpdate(foodId, {
                $inc: { savesCount: -1 }
            })

            res.status(200).json({
                message: "Food unsaved successfully",
                isSaved: false
            })
            return
        }

        const save = await saveModel.create({
            user: user._id,
            food: foodId
        })

        await foodModel.findByIdAndUpdate(foodId, {
            $inc: { savesCount: 1 }
        })

        res.status(201).json({
            message: "Food saved successfully",
            isSaved: true,
            save
        })
    } catch (error) {
        console.error('Save food error:', error);
        res.status(500).json({
            message: "Error processing save",
            error: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

const getSaveFood = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user

        const savedFoods = await saveModel.find({
            user: user._id
        }).populate('food')

        if (!savedFoods || savedFoods.length === 0) {
            res.status(404).json({ message: "No saved foods found" });
            return
        }

        res.status(200).json({
            message: "Saved foods retrieved successfully",
            savedFoods
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching saved foods",
            error: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

// Delete a reel (only by food partner who created it)
const deleteFood = async (req: Request, res: Response): Promise<void> => {
    try {
        const { foodId } = req.params;
        const foodPartner = req.foodPartner;

        if (!foodPartner || !foodPartner._id) {
            res.status(401).json({
                message: "Food partner authentication required"
            });
            return;
        }

        const food = await foodModel.findById(foodId);
        if (!food) {
            res.status(404).json({
                message: "Reel not found"
            });
            return;
        }

        // Check if the food partner owns this reel
        if (food.foodPartner.toString() !== foodPartner._id.toString()) {
            res.status(403).json({
                message: "You can only delete your own reels"
            });
            return;
        }

        // Soft delete by setting isActive to false
        await foodModel.findByIdAndUpdate(foodId, { isActive: false });

        res.status(200).json({
            message: "Reel deleted successfully"
        });
    } catch (error) {
        console.error('Delete food error:', error);
        res.status(500).json({
            message: "Error deleting reel",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get reels by food partner (for dashboard)
const getFoodPartnerReels = async (req: Request, res: Response): Promise<void> => {
    try {
        const foodPartner = req.foodPartner;
        const { page = 1, limit = 10 } = req.query;

        if (!foodPartner || !foodPartner._id) {
            res.status(401).json({
                message: "Food partner authentication required"
            });
            return;
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const reels = await foodModel.find({
            foodPartner: foodPartner._id,
            isActive: true
        })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('foodPartner', 'name');

        const totalReels = await foodModel.countDocuments({
            foodPartner: foodPartner._id,
            isActive: true
        });

        const totalPages = Math.ceil(totalReels / limitNum);

        res.status(200).json({
            message: "Reels fetched successfully",
            foods: reels,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalFoods: totalReels,
                hasNext: pageNum < totalPages
            }
        });
    } catch (error) {
        console.error('Get food partner reels error:', error);
        res.status(500).json({
            message: "Error fetching reels",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Record video view
const recordView = async (req: Request, res: Response): Promise<void> => {
    try {
        const { foodId } = req.params;
        const { viewDuration = 0, deviceInfo = '', totalDuration = 0 } = req.body as { viewDuration?: number; deviceInfo?: string; totalDuration?: number };
        const user = req.user;

        const food = await foodModel.findById(foodId);
        if (!food) {
            res.status(404).json({ message: "Reel not found" });
            return;
        }

        // Treat durations as milliseconds
        const viewMs = Math.max(0, Number(viewDuration) || 0);
        const totalMs = Math.max(0, Number(totalDuration) || 0);
        // Fallback threshold: 50% of total duration if provided, else 2000ms
        const thresholdMs = totalMs > 0 ? totalMs * 0.5 : 2000;

        // Helper to decide if threshold reached
        const reachedThreshold = (ms: number) => ms >= thresholdMs;

        // Track if we should increment on this request (threshold crossed now)
        let incrementNow = false;

        if (user && (user as any)._id) {
            // Authenticated user logic - single doc per user+food
            const existingView = await viewModel.findOne({ user: (user as any)._id, food: foodId });
            if (existingView) {
                const prevMs = Number(existingView.viewDuration) || 0;
                const newMs = Math.max(prevMs, viewMs);
                const wasReached = reachedThreshold(prevMs);
                const nowReached = reachedThreshold(newMs);
                if (!wasReached && nowReached) incrementNow = true;

                await viewModel.findOneAndUpdate(
                    { user: (user as any)._id, food: foodId },
                    {
                        viewDuration: newMs,
                        deviceInfo,
                        ipAddress: req.ip,
                        lastViewedAt: new Date()
                    }
                );
            } else {
                // Create new view record
                await viewModel.create({
                    user: (user as any)._id,
                    food: foodId,
                    viewDuration: viewMs,
                    deviceInfo,
                    ipAddress: req.ip
                });
                if (reachedThreshold(viewMs)) incrementNow = true;
            }
        } else {
            // Anonymous user logic - use recent doc (within 5 minutes) based on IP
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const existingView = await viewModel.findOne({
                food: foodId,
                ipAddress: req.ip,
                user: null,
                createdAt: { $gte: fiveMinutesAgo }
            }).sort({ createdAt: -1 });

            if (existingView) {
                const prevMs = Number(existingView.viewDuration) || 0;
                const newMs = Math.max(prevMs, viewMs);
                const wasReached = reachedThreshold(prevMs);
                const nowReached = reachedThreshold(newMs);
                if (!wasReached && nowReached) incrementNow = true;

                await viewModel.findByIdAndUpdate(existingView._id, {
                    viewDuration: newMs,
                    deviceInfo,
                    ipAddress: req.ip,
                    lastViewedAt: new Date()
                });
            } else {
                await viewModel.create({
                    user: null,
                    food: foodId,
                    viewDuration: viewMs,
                    deviceInfo,
                    ipAddress: req.ip
                });
                if (reachedThreshold(viewMs)) incrementNow = true;
            }
        }

        if (incrementNow) {
            const updatedFood = await foodModel.findByIdAndUpdate(
                foodId,
                { $inc: { viewsCount: 1 } },
                { new: true }
            );
            res.status(200).json({
                message: "View recorded at 50% threshold",
                newViewCount: updatedFood?.viewsCount || food.viewsCount
            });
            return;
        }

        res.status(200).json({
            message: "View progress updated",
            newViewCount: food.viewsCount
        });
    } catch (error) {
        console.error('Record view error:', error);
        res.status(500).json({
            message: "Error recording view",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get user's liked reels
const getLikedReels = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        const { page = 1, limit = 10 } = req.query;

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            });
            return;
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const likedReels = await likeModel.find({ user: user._id })
            .populate({
                path: 'food',
                match: { isActive: true },
                populate: {
                    path: 'foodPartner',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        // Filter out null foods (deleted reels)
        const validLikedReels = likedReels.filter(like => like.food !== null);

        const totalLiked = await likeModel.countDocuments({ user: user._id });

        res.status(200).json({
            message: "Liked reels fetched successfully",
            likedReels: validLikedReels,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalLiked / limitNum),
                totalLiked,
                hasNext: pageNum * limitNum < totalLiked
            }
        });
    } catch (error) {
        console.error('Get liked reels error:', error);
        res.status(500).json({
            message: "Error fetching liked reels",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Video streaming upload endpoint
const uploadVideoForStreaming = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                message: "Video file is required"
            });
            return;
        }

        // Validate file type
        const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            res.status(400).json({
                message: "Invalid file type. Only video files are allowed."
            });
            return;
        }

        console.log('Uploading video to ImageKit for streaming...');
        const videoUploadResult = await VideoStreamService.uploadVideo(req.file);

        res.status(200).json({
            message: "Video uploaded for streaming successfully",
            videoUrl: videoUploadResult.url,
            fileId: videoUploadResult.fileId
        });

    } catch (error) {
        console.error('Video streaming upload error:', error);
        res.status(500).json({
            message: "Error processing video for streaming",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get streaming video by lesson ID
const getStreamingVideo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            res.status(400).json({
                message: "Video ID is required"
            });
            return;
        }

        // Return direct streaming URL for the video
        res.status(200).json({
            message: "Streaming video found",
            videoUrl: `/api/video/stream/${videoId}`,
            fileId: videoId
        });

    } catch (error) {
        console.error('Get streaming video error:', error);
        res.status(500).json({
            message: "Error fetching streaming video",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

export {
    createFood, deleteFood, getFoodItems, getFoodPartnerReels, getLikedReels,
    getSaveFood, getStreamingVideo, likeFood, recordView, saveFood, uploadVideoForStreaming
};
