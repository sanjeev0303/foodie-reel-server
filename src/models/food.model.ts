import mongoose from "mongoose";

const FoodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    video: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    restaurantAddress: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, // Thumbnail URL for the video
    },
    duration: {
        type: Number, // Video duration in seconds
    },
    tags: [{
        type: String
    }],
    foodPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'foodPartner',
        required: true
    },
    likeCount: {
        type: Number,
        default: 0
    },
    savesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    hlsVideo: {
        type: String, // HLS master playlist URL
    },
    lessonId: {
        type: String, // Unique identifier for the HLS video
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true});

// Index for better performance
FoodSchema.index({ foodPartner: 1, createdAt: -1 });
FoodSchema.index({ isActive: 1, createdAt: -1 });
FoodSchema.index({ tags: 1 });

export const foodModel = mongoose.model("food", FoodSchema)
