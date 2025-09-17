import express from 'express';
import {
    createComment,
    getComments,
    deleteComment,
    likeComment
} from '../controllers/comment.controller';
import { authUserMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Create a new comment
router.post('/:foodId', authUserMiddleware, createComment);

// Get comments for a reel
router.get('/:foodId', getComments);

// Delete a comment
router.delete('/:commentId', authUserMiddleware, deleteComment);

// Like/Unlike a comment (toggle)
router.post('/:commentId/like', authUserMiddleware, likeComment);

export default router;
