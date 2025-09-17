// Simple in-memory queue service for video streaming optimization
// For production, use Redis with BullMQ

interface QueueJob {
    id: string;
    type: string;
    data: any;
    priority: number;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    processedAt?: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

class SimpleQueue {
    private jobs: QueueJob[] = [];
    private processing = false;
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    async add(jobType: string, data: any, options: {
        priority?: number;
        maxAttempts?: number;
    } = {}): Promise<QueueJob> {
        const job: QueueJob = {
            id: `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: jobType,
            data,
            priority: options.priority || 5,
            attempts: 0,
            maxAttempts: options.maxAttempts || 3,
            createdAt: new Date(),
            status: 'pending'
        };

        this.jobs.push(job);
        this.jobs.sort((a, b) => a.priority - b.priority); // Lower number = higher priority

        console.log(`Job ${job.id} added to ${this.name} queue`);

        // Start processing if not already processing
        if (!this.processing) {
            this.processJobs();
        }

        return job;
    }

    private async processJobs() {
        this.processing = true;

        while (this.jobs.length > 0) {
            const job = this.jobs.find(j => j.status === 'pending');
            if (!job) break;

            job.status = 'processing';
            job.attempts++;

            try {
                await this.processJob(job);
                job.status = 'completed';
                job.processedAt = new Date();
                console.log(`Job ${job.id} completed successfully`);
            } catch (error) {
                job.error = error instanceof Error ? error.message : 'Unknown error';

                if (job.attempts >= job.maxAttempts) {
                    job.status = 'failed';
                    console.error(`Job ${job.id} failed after ${job.attempts} attempts:`, job.error);
                } else {
                    job.status = 'pending';
                    console.log(`Job ${job.id} failed, retrying (attempt ${job.attempts}/${job.maxAttempts})`);
                }
            }
        }

        // Clean up completed jobs (keep last 100)
        this.jobs = this.jobs.filter(job =>
            job.status !== 'completed' && job.status !== 'failed'
        ).concat(
            this.jobs.filter(job =>
                job.status === 'completed' || job.status === 'failed'
            ).slice(-100)
        );

        this.processing = false;
    }

    private async processJob(job: QueueJob): Promise<void> {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        switch (job.type) {
            case 'process-video':
                return this.processVideo(job.data);
            case 'stream-video':
                return this.streamVideo(job.data);
            case 'process-analytics':
                return this.processAnalytics(job.data);
            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }
    }

    private async processVideo(data: any): Promise<void> {
        console.log(`Processing video ${data.videoId} with compression ${data.compressionLevel}`);
        // Simulate video processing
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    private async streamVideo(data: any): Promise<void> {
        console.log(`Setting up stream for video ${data.videoId} to user ${data.userId}`);
        // Simulate stream setup
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    private async processAnalytics(data: any): Promise<void> {
        console.log(`Processing analytics event: ${data.eventType}`);
        // Simulate analytics processing
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    getStats() {
        return {
            total: this.jobs.length,
            pending: this.jobs.filter(j => j.status === 'pending').length,
            processing: this.jobs.filter(j => j.status === 'processing').length,
            completed: this.jobs.filter(j => j.status === 'completed').length,
            failed: this.jobs.filter(j => j.status === 'failed').length,
            isProcessing: this.processing
        };
    }
}

// Create queue instances
export const videoProcessingQueue = new SimpleQueue('video-processing');
export const videoStreamingQueue = new SimpleQueue('video-streaming');
export const analyticsQueue = new SimpleQueue('analytics');

// Utility functions to add jobs to queues
export const addVideoProcessingJob = async (videoData: {
    videoId: string;
    videoPath: string;
    compressionLevel: 'low' | 'medium' | 'high';
}) => {
    const priority = videoData.compressionLevel === 'high' ? 1 :
                    videoData.compressionLevel === 'medium' ? 3 : 5;

    return await videoProcessingQueue.add('process-video', videoData, {
        priority,
        maxAttempts: 3
    });
};

export const addVideoStreamingJob = async (streamData: {
    userId: string;
    videoId: string;
    quality: 'low' | 'medium' | 'high';
    startTime?: number;
}) => {
    const priority = streamData.quality === 'high' ? 1 :
                    streamData.quality === 'medium' ? 2 : 3;

    return await videoStreamingQueue.add('stream-video', streamData, {
        priority,
        maxAttempts: 2
    });
};

export const addAnalyticsJob = async (analyticsData: {
    eventType: 'view' | 'like' | 'share' | 'comment';
    data: any;
}) => {
    return await analyticsQueue.add('process-analytics', analyticsData, {
        priority: 10, // Lower priority for analytics
        maxAttempts: 1
    });
};

// Get queue statistics
export const getQueueStats = () => {
    return {
        videoProcessing: videoProcessingQueue.getStats(),
        videoStreaming: videoStreamingQueue.getStats(),
        analytics: analyticsQueue.getStats()
    };
};

/*
 * For production deployment, replace this with Redis + BullMQ:
 *
 * 1. Install Redis:
 *    - Ubuntu/Debian: sudo apt install redis-server
 *    - macOS: brew install redis
 *    - Windows: Use WSL or Docker
 *
 * 2. Start Redis: redis-server
 *
 * 3. Update environment variables:
 *    REDIS_HOST=localhost
 *    REDIS_PORT=6379
 *
 * 4. Uncomment the Redis implementation above and remove this simple queue
 */
