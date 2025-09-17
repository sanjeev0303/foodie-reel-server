import mongoose from "mongoose";

const ViewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false // Allow anonymous views
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food',
        required: true
    },
    viewDuration: {
        type: Number, // Duration watched in seconds
        default: 0
    },
    deviceInfo: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String
    },
    lastViewedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index to prevent duplicate views from same user (only for authenticated users)
// Remove unique constraint for user field to allow multiple null values
ViewSchema.index({ user: 1, food: 1 });
// For anonymous users, use IP-based indexing with time component
ViewSchema.index({ ipAddress: 1, food: 1, createdAt: -1 });
ViewSchema.index({ food: 1, createdAt: -1 });

export const viewModel = mongoose.model("view", ViewSchema);
