import mongoose from "mongoose";


const LikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food',
        required: true
    }
}, { timestamps: true })

export const likeModel = mongoose.model('like', LikeSchema)
