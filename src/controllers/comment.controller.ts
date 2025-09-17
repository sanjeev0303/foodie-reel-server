import { Request, Response } from 'express';
import { commentModel } from '../models/comment.model';
import { commentLikeModel } from '../models/commentLike.model';
import { foodModel } from '../models/food.model';

// Create a new comment
const createComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content, parentCommentId } = req.body;
        const { foodId } = req.params;
        const user = req.user;

        if (!content) {
            res.status(400).json({
                message: "Content is required"
            });
            return;
        }

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            });
            return;
        }

        // Check if food exists
        const foodExists = await foodModel.findById(foodId);
        if (!foodExists) {
            res.status(404).json({
                message: "Food item not found"
            });
            return;
        }

        // If it's a reply, check if parent comment exists
        if (parentCommentId) {
            const parentComment = await commentModel.findById(parentCommentId);
            if (!parentComment) {
                res.status(404).json({
                    message: "Parent comment not found"
                });
                return;
            }
        }

        const comment = await commentModel.create({
            content,
            user: user._id,
            food: foodId,
            parentComment: parentCommentId || null
        });

        // Increment comment count in food
        await foodModel.findByIdAndUpdate(foodId, {
            $inc: { commentsCount: 1 }
        });

        // If it's a reply, increment replies count in parent comment
        if (parentCommentId) {
            await commentModel.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 }
            });
        }

        const populatedComment = await commentModel.findById(comment._id)
            .populate('user', 'fullName')
            .populate('parentComment');

        res.status(201).json({
            message: "Comment created successfully",
            comment: populatedComment
        });
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({
            message: "Error creating comment",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get comments for a food item
const getComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { foodId } = req.params;
        const { page = 1, limit = 20, parentCommentId } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        let query: any = {
            food: foodId,
            isDeleted: false
        };

        // If parentCommentId is provided, get replies; otherwise get top-level comments
        if (parentCommentId) {
            query.parentComment = parentCommentId;
        } else {
            query.parentComment = null;
        }

        const comments = await commentModel.find(query)
            .populate('user', 'fullName')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const totalComments = await commentModel.countDocuments(query);

        res.status(200).json({
            message: "Comments fetched successfully",
            comments,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalComments / limitNum),
                totalComments,
                hasNext: pageNum * limitNum < totalComments
            }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            message: "Error fetching comments",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Like/Unlike a comment
const likeComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.body;
        const user = req.user;

        if (!commentId) {
            res.status(400).json({
                message: "commentId is required"
            });
            return;
        }

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            });
            return;
        }

        // Check if comment exists
        const commentExists = await commentModel.findById(commentId);
        if (!commentExists) {
            res.status(404).json({
                message: "Comment not found"
            });
            return;
        }

        const existingLike = await commentLikeModel.findOne({
            user: user._id,
            comment: commentId
        });

        if (existingLike) {
            // Unlike the comment
            await commentLikeModel.deleteOne({
                user: user._id,
                comment: commentId
            });

            await commentModel.findByIdAndUpdate(commentId, {
                $inc: { likesCount: -1 }
            });

            res.status(200).json({
                message: "Comment unliked successfully",
                isLiked: false
            });
        } else {
            // Like the comment
            await commentLikeModel.create({
                user: user._id,
                comment: commentId
            });

            await commentModel.findByIdAndUpdate(commentId, {
                $inc: { likesCount: 1 }
            });

            res.status(201).json({
                message: "Comment liked successfully",
                isLiked: true
            });
        }
    } catch (error) {
        console.error('Like comment error:', error);
        res.status(500).json({
            message: "Error processing comment like",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Delete a comment
const deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const user = req.user;

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            });
            return;
        }

        const comment = await commentModel.findById(commentId);
        if (!comment) {
            res.status(404).json({
                message: "Comment not found"
            });
            return;
        }

        // Check if user owns the comment
        if (comment.user.toString() !== user._id.toString()) {
            res.status(403).json({
                message: "You can only delete your own comments"
            });
            return;
        }

        // Soft delete the comment
        await commentModel.findByIdAndUpdate(commentId, {
            isDeleted: true,
            content: "[Comment deleted]"
        });

        // Decrement comment count in food
        await foodModel.findByIdAndUpdate(comment.food, {
            $inc: { commentsCount: -1 }
        });

        // If it's a reply, decrement replies count in parent comment
        if (comment.parentComment) {
            await commentModel.findByIdAndUpdate(comment.parentComment, {
                $inc: { repliesCount: -1 }
            });
        }

        res.status(200).json({
            message: "Comment deleted successfully"
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            message: "Error deleting comment",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Edit a comment
const editComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const user = req.user;

        if (!content) {
            res.status(400).json({
                message: "Content is required"
            });
            return;
        }

        if (!user || !user._id) {
            res.status(401).json({
                message: "User authentication required"
            });
            return;
        }

        const comment = await commentModel.findById(commentId);
        if (!comment) {
            res.status(404).json({
                message: "Comment not found"
            });
            return;
        }

        // Check if user owns the comment
        if (comment.user.toString() !== user._id.toString()) {
            res.status(403).json({
                message: "You can only edit your own comments"
            });
            return;
        }

        const updatedComment = await commentModel.findByIdAndUpdate(
            commentId,
            { content, isEdited: true },
            { new: true }
        ).populate('user', 'fullName');

        res.status(200).json({
            message: "Comment updated successfully",
            comment: updatedComment
        });
    } catch (error) {
        console.error('Edit comment error:', error);
        res.status(500).json({
            message: "Error editing comment",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

export {
    createComment,
    getComments,
    likeComment,
    deleteComment,
    editComment
};
