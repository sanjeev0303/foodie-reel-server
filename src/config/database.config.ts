import mongoose from "mongoose";
import * as conf from "./env.config"

// Database connection status
let isConnected = false;

export const connectDB = async () => {
    const options = {
        serverSelectionTimeoutMS: 10000, // Timeout after 10s for better Atlas connection
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        retryWrites: true,
    };

    // Connect to MongoDB Atlas only
    if (!conf.DATABASE_URL) {
        throw new Error('DATABASE_URL is required in environment variables');
    }

    try {
        console.log("🌍 Attempting to connect to MongoDB Atlas...");

        // Validate the connection string format
        const dbUrl = conf.DATABASE_URL as string;
        if (!dbUrl.includes('mongodb')) {
            throw new Error('Invalid DATABASE_URL format - must be a valid MongoDB connection string');
        }

        await mongoose.connect(dbUrl, options);
        isConnected = true;
        console.log("🍃 MongoDB Atlas connected successfully");
        console.log(`🌍 Connected to: ${mongoose.connection.host}:${mongoose.connection.port}`);
        console.log(`📁 Database name: ${mongoose.connection.name}`);
        setupConnectionListeners();

    } catch (error) {
        isConnected = false;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log("🔴 MongoDB Atlas connection failed:", errorMessage);

        // More specific error messages
        if (errorMessage.includes('authentication failed')) {
            console.log("💡 Check your MongoDB Atlas username and password");
        } else if (errorMessage.includes('network timeout')) {
            console.log("💡 Check your internet connection and MongoDB Atlas network settings");
        } else if (errorMessage.includes('not authorized')) {
            console.log("💡 Check your MongoDB Atlas database permissions");
        } else if (errorMessage.includes('ENOTFOUND')) {
            console.log("💡 DNS resolution failed - check your internet connection");
        }

        console.log("� To fix this:");
        console.log("   1. Verify your DATABASE_URL in .env file");
        console.log("   2. Check your internet connection");
        console.log("   3. Verify MongoDB Atlas cluster is running");
        console.log("   4. Check IP whitelist in MongoDB Atlas");

        throw error; // Re-throw to let the caller handle it
    }
}

const setupConnectionListeners = () => {
    // Connection event listeners
    mongoose.connection.on('connected', () => {
        isConnected = true;
        console.log('🟢 MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
        isConnected = false;
        console.log('🔴 MongoDB connection error:', err.message);

        // More specific error handling
        if (err.message.includes('authentication failed')) {
            console.log('💡 Authentication failed - check your MongoDB credentials');
        } else if (err.message.includes('network timeout')) {
            console.log('💡 Network timeout - check your internet connection');
        }
    });

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.log('🟡 MongoDB disconnected - attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
        isConnected = true;
        console.log('🟢 MongoDB reconnected successfully');
    });

    // Handle connection timeout
    mongoose.connection.on('timeout', () => {
        console.log('⏰ MongoDB connection timeout');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        try {
            await mongoose.connection.close();
            console.log('🔴 MongoDB connection closed due to app termination');
            process.exit(0);
        } catch (error) {
            console.log('🔴 Error closing MongoDB connection:', error);
            process.exit(1);
        }
    });
}

// Function to check if database is connected
export const isDBConnected = (): boolean => {
    return isConnected && mongoose.connection.readyState === 1;
}

// Function to get connection status
export const getDBStatus = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    return {
        isConnected: isDBConnected(),
        state: states[mongoose.connection.readyState as keyof typeof states] || 'unknown',
        host: mongoose.connection.host || 'unknown',
        name: mongoose.connection.name || 'unknown'
    };
}
