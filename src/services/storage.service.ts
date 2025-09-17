import ImageKit from "imagekit";
import * as conf from '../config/env.config'
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID as uuid } from 'crypto';

const imagekit = new ImageKit({
    publicKey: conf.IMAGEKIT_PUBLIC_KEY!,
    privateKey: conf.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: conf.IMAGEKIT_URL_ENDPOINT!
});

// Local storage fallback directory
const FALLBACK_STORAGE_DIR = path.join(process.cwd(), 'uploads', 'videos');

// Ensure the fallback directory exists
const ensureFallbackDir = () => {
    if (!fs.existsSync(FALLBACK_STORAGE_DIR)) {
        fs.mkdirSync(FALLBACK_STORAGE_DIR, { recursive: true });
        console.log('📁 Created fallback storage directory:', FALLBACK_STORAGE_DIR);
    }
};

// Fallback upload to local storage
const uploadToLocalStorage = async (file: string | Buffer, fileName: string): Promise<any> => {
    try {
        ensureFallbackDir();

        const fileId = uuid();
        const extension = path.extname(fileName) || '.mp4';
        const localFileName = `${fileId}${extension}`;
        const localFilePath = path.join(FALLBACK_STORAGE_DIR, localFileName);

        // Write file to local storage
        if (typeof file === 'string') {
            // If file is base64 string
            const buffer = Buffer.from(file, 'base64');
            fs.writeFileSync(localFilePath, buffer);
        } else {
            // If file is already a buffer
            fs.writeFileSync(localFilePath, file);
        }

        const fileStats = fs.statSync(localFilePath);

        // Return structure similar to ImageKit response
        return {
            fileId: fileId,
            name: localFileName,
            filePath: localFilePath,
            url: `http://localhost:5000/api/local-videos/${localFileName}`,
            thumbnailUrl: `http://localhost:5000/api/local-videos/${localFileName}/thumbnail`,
            size: fileStats.size,
            fileType: 'video',
            uploadedAt: new Date().toISOString(),
            isLocal: true // Flag to indicate this is local storage
        };
    } catch (error) {
        console.error('Local storage upload failed:', error);
        throw new Error('Failed to upload to local storage');
    }
};

export const uploadFile = async (file: string | Buffer, fileName: string): Promise<any> => {
    try {
        console.log('🔄 Attempting ImageKit upload for:', fileName);

        // Try ImageKit upload first
        const result = await imagekit.upload({
            file: file,
            fileName: fileName,
            folder: '/videos' // Organize uploads in videos folder
        });

        console.log('✅ ImageKit upload successful:', result.fileId);
        return result;

    } catch (imagekitError: any) {
        console.warn('⚠️ ImageKit upload failed, using local storage fallback:', imagekitError.message);

        // Check if it's a network connectivity issue
        if (imagekitError.code === 'ENETUNREACH' ||
            imagekitError.code === 'ENOTFOUND' ||
            imagekitError.message?.includes('connect') ||
            imagekitError.message?.includes('network')) {

            console.log('🔄 Network issue detected, switching to local storage...');

            try {
                const localResult = await uploadToLocalStorage(file, fileName);
                console.log('✅ Local storage upload successful:', localResult.fileId);
                return localResult;
            } catch (localError) {
                console.error('❌ Both ImageKit and local storage failed:', localError);
                throw new Error('Video upload failed: Unable to reach ImageKit servers and local storage failed');
            }
        } else {
            // For non-network errors, still try local fallback but with different message
            console.log('🔄 ImageKit error (non-network), trying local storage...');
            try {
                const localResult = await uploadToLocalStorage(file, fileName);
                console.log('✅ Local storage upload successful:', localResult.fileId);
                return localResult;
            } catch (localError) {
                console.error('❌ Both ImageKit and local storage failed');
                throw new Error(`Upload failed: ${imagekitError.message}`);
            }
        }
    }
};
