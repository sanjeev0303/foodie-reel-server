import express from 'express'
import multer from 'multer'
import { VideoController } from '../controllers/video.controller'
import * as path from 'path'
import * as fs from 'fs'

const router = express.Router();

// Configure multer for file uploads (20MB limit to match ImageKit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only video files
        if (file.mimetype.startsWith('video/')) {
            cb(null, true)
        } else {
            cb(new Error('Only video files are allowed'))
        }
    }
})

// Routes
router.get('/videos', VideoController.getAllVideos)
router.get('/videos-with-views', VideoController.getAllVideosWithViews)
router.get('/video/:fileId', VideoController.getVideoWithViews)
router.post('/video/:fileId/view', VideoController.recordVideoView)
router.get('/stream/:fileId', VideoController.streamVideo)
router.get('/proxy', VideoController.proxyImageKitVideo)
router.post('/upload', upload.single('video'), VideoController.uploadVideo)

// Local video serving route (fallback when ImageKit is unavailable)
router.get('/local-videos/:filename', (req, res): void => {
    try {
        const filename = req.params.filename;
        const localStorageDir = path.join(process.cwd(), 'uploads', 'videos');
        const filePath = path.join(localStorageDir, filename);

        // Security check: ensure file is within the allowed directory
        if (!filePath.startsWith(localStorageDir)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Set appropriate headers
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0] || '0', 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunksize,
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Serve entire file
            res.setHeader('Content-Length', fileSize);
            const file = fs.createReadStream(filePath);
            file.pipe(res);
        }
    } catch (error) {
        console.error('Error serving local video:', error);
        res.status(500).json({ error: 'Failed to serve video' });
    }
});

// Local video thumbnail route
router.get('/local-videos/:filename/thumbnail', (req, res) => {
    // For now, return a placeholder thumbnail
    // In production, you might want to generate actual thumbnails
    const placeholderSvg = `
        <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#333"/>
            <text x="50%" y="50%" fill="#fff" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="16">
                📹 Local Video
            </text>
            <text x="50%" y="70%" fill="#ccc" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12">
                ${req.params.filename}
            </text>
        </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(placeholderSvg);
});

export default router
