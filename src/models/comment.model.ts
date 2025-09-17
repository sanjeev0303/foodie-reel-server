import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        maxlength: 500
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment',
        default: null // For reply functionality
    },
    likesCount: {
        type: Number,
        default: 0
    },
    repliesCount: {
        type: Number,
        default: 0
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes for better performance
CommentSchema.index({ food: 1, createdAt: -1 });
CommentSchema.index({ user: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, createdAt: -1 });

export const commentModel = mongoose.model("comment", CommentSchema);
