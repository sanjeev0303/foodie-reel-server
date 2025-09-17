import mongoose from "mongoose";

const CommentLikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment',
        required: true
    }
}, { timestamps: true });

// Compound index to prevent duplicate likes
CommentLikeSchema.index({ user: 1, comment: 1 }, { unique: true });

export const commentLikeModel = mongoose.model("commentLike", CommentLikeSchema);
