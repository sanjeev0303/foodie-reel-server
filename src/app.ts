import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { getDBStatus } from './config/database.config';
import authRoutes from './routes/auth.routes'
import foodRoutes from './routes/food.routes'
import foodPartnerRoutes from './routes/food-partner.routes'
import commentRoutes from './routes/comment.routes'
import videoRoutes from './routes/video.routes'
import { authUserMiddleware } from './middleware/auth.middleware'

class ExpressApp {
    private app: Application;

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddlewares(): void {
        // Security middleware
        this.app.use(helmet());

        // CORS middleware - Allow all origins for public API
        this.app.use(cors({
            origin: true, // Allow all origins
            credentials: true
        }));

        // Cookie parser middleware
        this.app.use(cookieParser());

        // Logging middleware
        this.app.use(morgan('combined'));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }

    private initializeRoutes(): void {
        // Health check route
        this.app.get('/health', (req: Request, res: Response) => {
            const dbStatus = getDBStatus();
            res.status(200).json({
                status: 'OK',
                message: 'Server is running',
                timestamp: new Date().toISOString(),
                database: {
                    connected: dbStatus.isConnected,
                    state: dbStatus.state,
                    host: dbStatus.host,
                    name: dbStatus.name
                }
            });
        });

        // Database status route
        this.app.get('/api/status/database', (req: Request, res: Response) => {
            const dbStatus = getDBStatus();
            res.status(dbStatus.isConnected ? 200 : 503).json({
                database: dbStatus,
                timestamp: new Date().toISOString()
            });
        });

        // API base route
        this.app.get('/api', (req: Request, res: Response) => {
            res.status(200).json({
                message: 'Zomato Reels API',
                version: '1.0.0'
            });
        });

        // Static file serving for HLS videos (aligned with VideoStreamingService URLs)
        const hlsStaticDir = path.join(process.cwd(), 'uploads/hls');

        // Static file serving for local videos (fallback when ImageKit is unavailable)
        const localVideosDir = path.join(process.cwd(), 'uploads/videos');

        // Local video serving with CORS support for all origins
        this.app.use(
            '/uploads/videos',
            express.static(localVideosDir, {
                setHeaders: (res, filePath) => {
                    // CORS for all origins
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                    res.setHeader('Content-Type', 'video/mp4');
                    res.setHeader('Cache-Control', 'public, max-age=3600');
                }
            })
        );

        // Preflight for local video assets - Allow all origins
        this.app.options('/uploads/videos/*', (req: Request, res: Response) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range');
            res.status(204).end();
        });

        // Optional protection for HLS assets
        const hlsProtection = (req: Request, res: Response, next: NextFunction) => {
            if (process.env.HLS_PROTECTED === 'true') {
                // Reuse existing auth; ensure cookies are sent from client
                return authUserMiddleware(req as any, res as any, next as any);
            }
            return next();
        };

        this.app.use(
            '/uploads/hls',
            hlsProtection,
            express.static(hlsStaticDir, {
                setHeaders: (res, filePath) => {
                    // CORS for all origins
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

                    if (filePath.endsWith('.m3u8')) {
                        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                        // Prevent caching of playlists
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                    } else if (filePath.endsWith('.ts')) {
                        res.setHeader('Content-Type', 'video/mp2t');
                        // Cache segments aggressively
                        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    }
                }
            })
        );

        // Preflight for HLS assets - Allow all origins
        this.app.options('/uploads/hls/*', (req: Request, res: Response) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range');
            res.status(204).end();
        });

        // API routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/food', foodRoutes);
        this.app.use('/api/food-partner', foodPartnerRoutes);
        this.app.use('/api/comments', commentRoutes);
        this.app.use('/api/video', videoRoutes);


    }

    private initializeErrorHandling(): void {
        // Global error handler
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            console.error('Error:', err.stack);

            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'production'
                    ? 'Something went wrong!'
                    : err.message
            });
        });
    }

    public getApp(): Application {
        return this.app;
    }
}

export default ExpressApp;
