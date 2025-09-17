import { Request, Response } from 'express'
import { VideoStreamService } from '../services/video-stream.service'
import { videoModel } from '../models/video.model'
import { videoViewModel } from '../models/videoView.model'
import { foodModel } from '../models/food.model'

export class VideoController {
    // Get all videos with secure streaming URLs
    static async getAllVideos(req: Request, res: Response) {
        try {
            const result = await VideoStreamService.getAllVideos()
            res.json(result)
        } catch (error: any) {
            console.error('Error in getAllVideos:', error)
            res.status(500).json({ error: error.message })
        }
    }

    // Stream video content with range support
    static async streamVideo(req: Request, res: Response) {
        return await VideoStreamService.streamVideo(req, res)
    }

    // Proxy ImageKit URLs through our server
    static async proxyImageKitVideo(req: Request, res: Response) {
        return await VideoStreamService.proxyImageKitVideo(req, res)
    }

    // Upload video to ImageKit
    static async uploadVideo(req: Request, res: Response): Promise<Response | void> {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' })
            }

            const result = await VideoStreamService.uploadVideo(req.file)

            // Save video info to database
            try {
                const video = new videoModel({
                    fileId: result.fileId,
                    name: result.name,
                    url: result.url,
                    size: result.size
                })
                await video.save()
            } catch (dbError) {
                console.error('Error saving video to database:', dbError)
                // Don't fail the upload if DB save fails
            }

            res.json(result)
        } catch (error: any) {
            console.error('Error in uploadVideo:', error)
            res.status(500).json({ error: error.message })
        }
    }

    // Record video view
    static async recordVideoView(req: Request, res: Response): Promise<Response | void> {
        try {
            const { fileId } = req.params
            const { viewDuration = 0, totalDuration = 0, deviceInfo = '', userAgent = '' } = req.body

            console.log(`Recording video view for fileId: ${fileId}`, { viewDuration, totalDuration, deviceInfo })

            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' })
            }

            // Find or create video record - search by both fileId and name
            let video = await videoModel.findOne({
                $or: [
                    { fileId: fileId },
                    { name: fileId }
                ]
            })
            if (!video) {
                console.log(`Video not found in database for fileId: ${fileId}, attempting to fetch from ImageKit`)
                // Try to get video info from ImageKit if not in database
                try {
                    const imagekitVideos = await VideoStreamService.getAllVideos()
                    const videoInfo = imagekitVideos.videos.find(v => v.fileId === fileId || v.name === fileId)
                    if (videoInfo) {
                        console.log(`Found video in ImageKit, creating database record:`, videoInfo)
                        video = new videoModel({
                            fileId: videoInfo.fileId,
                            name: videoInfo.name,
                            url: videoInfo.url,
                            size: videoInfo.size
                        })
                        await video.save()
                    } else {
                        console.error(`Video not found in ImageKit for fileId: ${fileId}`)
                        console.log(`Available videos in ImageKit:`, imagekitVideos.videos.map(v => ({ fileId: v.fileId, name: v.name })))
                        return res.status(404).json({ error: 'Video not found' })
                    }
                } catch (error) {
                    console.error(`Error fetching videos from ImageKit:`, error)
                    return res.status(404).json({ error: 'Video not found' })
                }
            }

            const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown'
            const userId = (req as any).user?._id // Assuming auth middleware sets user

            // Calculate completion percentage
            const completionPercentage = totalDuration > 0 ? Math.min((viewDuration / totalDuration) * 100, 100) : 0

            // Check if user already has a view for this video
            const existingView = userId
                ? await videoViewModel.findOne({ user: userId, video: video._id })
                : await videoViewModel.findOne({
                    ipAddress,
                    video: video._id,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
                })

            if (existingView) {
                // Update existing view if new duration is longer
                if (viewDuration > existingView.viewDuration) {
                    existingView.viewDuration = viewDuration
                    existingView.totalDuration = totalDuration
                    existingView.completionPercentage = completionPercentage
                    existingView.lastViewedAt = new Date()
                    existingView.deviceInfo = deviceInfo
                    existingView.userAgent = userAgent
                    await existingView.save()
                }
            } else {
                // Create new view record
                const newView = new videoViewModel({
                    user: userId || null,
                    video: video._id,
                    fileId,
                    viewDuration,
                    totalDuration,
                    completionPercentage,
                    deviceInfo,
                    ipAddress,
                    userAgent,
                })
                await newView.save()

                // Increment view count only for new views
                await videoModel.findByIdAndUpdate(video._id, { $inc: { viewsCount: 1 } })

                // Also update the corresponding food model's view count
                await foodModel.updateOne(
                    {
                        $or: [
                            { video: { $regex: fileId, $options: 'i' } },
                            { lessonId: fileId }
                        ]
                    },
                    { $inc: { viewsCount: 1 } }
                )
            }

            // Get the updated view count from food model (since that's what client displays)
            const updatedFood = await foodModel.findOne({
                $or: [
                    { video: { $regex: fileId, $options: 'i' } },
                    { lessonId: fileId }
                ]
            })
            const finalViewCount = updatedFood?.viewsCount || 1

            res.json({
                success: true,
                message: 'View recorded successfully',
                viewsCount: finalViewCount
            })
        } catch (error: any) {
            console.error('Error recording video view:', error)
            res.status(500).json({ error: 'Failed to record view' })
        }
    }

    // Get video with view count
    static async getVideoWithViews(req: Request, res: Response): Promise<Response | void> {
        try {
            const { fileId } = req.params

            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' })
            }

            const video = await videoModel.findOne({ fileId })
            if (!video) {
                return res.status(404).json({ error: 'Video not found' })
            }

            res.json(video)
        } catch (error: any) {
            console.error('Error getting video:', error)
            res.status(500).json({ error: error.message })
        }
    }

    // Get all videos with view counts
    static async getAllVideosWithViews(req: Request, res: Response) {
        try {
            const result = await VideoStreamService.getAllVideos()

            // Get view counts from database
            const videosWithViews = await Promise.all(
                result.videos.map(async (video: any) => {
                    const dbVideo = await videoModel.findOne({ fileId: video.fileId })
                    return {
                        ...video,
                        viewsCount: dbVideo?.viewsCount || 0,
                        dbId: dbVideo?._id
                    }
                })
            )

            res.json({ videos: videosWithViews })
        } catch (error: any) {
            console.error('Error in getAllVideosWithViews:', error)
            res.status(500).json({ error: error.message })
        }
    }
}
