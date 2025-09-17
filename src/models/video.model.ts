import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // Duration in seconds
        default: 0
    },
    thumbnail: {
        type: String
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for better performance
// Note: fileId already has unique: true which creates an index, so no need to add another
VideoSchema.index({ isActive: 1, createdAt: -1 });

export const videoModel = mongoose.model("video", VideoSchema);
