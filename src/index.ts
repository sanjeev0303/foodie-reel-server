import express, { Application } from 'express';
import dotenv from 'dotenv';
import ExpressApp from './app';
import { connectDB, getDBStatus } from './config/database.config';

// Load environment variables
dotenv.config();

class Server {
  private app: Application;
  private port: number;

  constructor() {
    const expressApp = new ExpressApp();
    this.app = expressApp.getApp();
    this.port = parseInt(process.env.PORT || '3000', 10);
  }

  public async start(): Promise<void> {
    try {
      // Try to connect to database, but don't crash if it fails
      if (process.env.DATABASE_URL) {
        try {
          await connectDB();
        } catch (dbError) {
          console.log('⚠️  Database connection failed, but server will continue without database');
          console.log('🔴 Database error:', dbError instanceof Error ? dbError.message : 'Unknown error');
        }
      } else {
        console.log('⚠️  No DATABASE_URL provided, skipping database connection');
      }

      // Start the server regardless of database connection status
      this.app.listen(this.port, () => {
        console.log(`🚀 Server running on http://localhost:${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Show database status
        const dbStatus = getDBStatus();
        if (dbStatus.isConnected) {
          console.log(`🍃 Database: ${dbStatus.state} to ${dbStatus.name} on ${dbStatus.host}`);
        } else {
          console.log(`🔴 Database: ${dbStatus.state} (Server running without database)`);
        }

        console.log('─'.repeat(50));
      });
    } catch (error) {
      console.error('🔴 Failed to start server:', error);
      process.exit(1);
    }
  }  public getApp(): Application {
    return this.app;
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
