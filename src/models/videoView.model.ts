import mongoose from "mongoose";

const VideoViewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false // Allow anonymous views
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'video',
        required: true
    },
    fileId: {
        type: String, // ImageKit fileId for reference
        required: true
    },
    viewDuration: {
        type: Number, // Duration watched in seconds
        default: 0
    },
    totalDuration: {
        type: Number, // Total video duration in seconds
        default: 0
    },
    completionPercentage: {
        type: Number, // Percentage of video watched (0-100)
        default: 0
    },
    deviceInfo: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    lastViewedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index to prevent duplicate views from same user
VideoViewSchema.index({ user: 1, video: 1 });
VideoViewSchema.index({ fileId: 1, ipAddress: 1, createdAt: -1 });
VideoViewSchema.index({ video: 1, createdAt: -1 });
VideoViewSchema.index({ completionPercentage: -1 });

export const videoViewModel = mongoose.model("videoView", VideoViewSchema);
