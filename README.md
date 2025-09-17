# Zomato Reels - Backend API

A comprehensive backend system for a TikTok-style reel scrolling application focused on food content. Built with TypeScript, Express.js, MongoDB, and includes advanced features like real-time queue management, analytics tracking, and video streaming optimization.

## 🚀 Features

### Core Functionality
- ✅ **Dual Authentication System** - Separate user types (Users & Food Partners)
- ✅ **Video Reel Management** - Upload, view, delete reels with metadata
- ✅ **User Interactions** - Like, save, comment, and reply system
- ✅ **Real-time Analytics** - View tracking and engagement metrics
- ✅ **Queue Management** - Intelligent video processing and streaming optimization
- ✅ **File Upload** - Cloud storage integration with ImageKit
- ✅ **Database Design** - Optimized MongoDB schemas with proper indexing

### Advanced Features
- 🔄 **Background Processing** - Video compression and analytics processing
- 📊 **Queue Statistics** - Real-time monitoring of processing queues
- 🔍 **Advanced Filtering** - Search by tags, food partners, and more
- 📱 **Mobile Optimized** - Designed for mobile-first reel consumption
- 🛡️ **Security** - JWT authentication, input validation, and error handling

## 🛠️ Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** ImageKit Cloud Storage
- **Queue System:** In-memory (with Redis/BullMQ option for production)
- **Development:** Nodemon, ts-node-dev

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.config.ts      # MongoDB connection
│   │   └── env.config.ts           # Environment configuration
│   ├── controllers/
│   │   ├── auth.controller.ts      # Authentication logic
│   │   ├── comment.controller.ts   # Comment system
│   │   └── food.controller.ts      # Reel management
│   ├── middleware/
│   │   └── auth.middleware.ts      # JWT verification
│   ├── models/
│   │   ├── user.model.ts           # User schema
│   │   ├── food-partner.model.ts   # Food partner schema
│   │   ├── food.model.ts           # Reel schema
│   │   ├── comment.model.ts        # Comment schema
│   │   ├── like.model.ts           # Like schema
│   │   ├── save.model.ts           # Save schema
│   │   └── view.model.ts           # View tracking schema
│   ├── routes/
│   │   ├── auth.routes.ts          # Authentication endpoints
│   │   ├── comment.routes.ts       # Comment endpoints
│   │   └── food.routes.ts          # Reel endpoints
│   ├── services/
│   │   ├── storage.service.ts      # File upload service
│   │   └── queue.service.ts        # Queue management
│   ├── app.ts                      # Express app configuration
│   └── index.ts                    # Server entry point
├── dist/                           # Compiled JavaScript
├── API_DOCUMENTATION.md            # Comprehensive API docs
├── package.json
└── tsconfig.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- ImageKit account (for file storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zomato-reels/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the server directory:
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/zomato-reels

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key

   # ImageKit Configuration
   IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
   IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id

   # Server Configuration
   PORT=5000
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   sudo systemctl start mongod

   # Or start MongoDB with Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

### Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## 📚 API Documentation

Comprehensive API documentation is available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

### Quick API Overview

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register/user` | POST | Register new user | ❌ |
| `/api/auth/login/user` | POST | User login | ❌ |
| `/api/food/` | GET | Get all reels | ✅ User |
| `/api/food/` | POST | Create reel | ✅ Food Partner |
| `/api/food/like` | POST | Like/unlike reel | ✅ User |
| `/api/comments/:foodId` | POST | Add comment | ✅ User |
| `/api/comments/:foodId` | GET | Get comments | ❌ |

## 🔧 Development

### Available Scripts

```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# TypeScript compilation in watch mode
npm run dev:ts-node
```

### Database Schemas

#### User Schema
```typescript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  isActive: Boolean,
  createdAt: Date
}
```

#### Food/Reel Schema
```typescript
{
  name: String,
  description: String,
  restaurantAddress: String,
  video: String (URL),
  thumbnail: String (URL),
  tags: [String],
  duration: Number,
  viewsCount: Number,
  likesCount: Number,
  commentsCount: Number,
  savesCount: Number,
  foodPartner: ObjectId,
  isActive: Boolean,
  createdAt: Date
}
```

## 🚀 Production Deployment

### Redis Setup (Recommended)

For production, replace the in-memory queue with Redis:

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server

   # macOS
   brew install redis

   # Docker
   docker run -d -p 6379:6379 --name redis redis:alpine
   ```

2. **Update environment variables**
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Update queue service**
   Uncomment the Redis implementation in `src/services/queue.service.ts`

### Performance Optimization

- **CDN**: Use CloudFront or similar for video delivery
- **Load Balancing**: Deploy multiple server instances
- **Database**: Use MongoDB Atlas with proper indexing
- **Caching**: Implement Redis caching for frequently accessed data

## 🎯 Key Features Implemented

### Authentication System
- ✅ Dual user types (Users & Food Partners)
- ✅ JWT-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Cookie-based token storage

### Reel Management
- ✅ Video upload with validation
- ✅ Cloud storage integration
- ✅ Metadata management (tags, duration, address)
- ✅ Soft delete functionality

### User Interactions
- ✅ Like/unlike system with analytics
- ✅ Save/unsave functionality
- ✅ View tracking with duration
- ✅ Comment system with replies
- ✅ Comment likes

### Queue Management
- ✅ Video processing queue
- ✅ Streaming optimization queue
- ✅ Analytics processing queue
- ✅ Priority-based job handling
- ✅ Queue statistics monitoring

### Analytics & Monitoring
- ✅ View tracking with device info
- ✅ Engagement metrics
- ✅ Queue performance monitoring
- ✅ Database connection status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🐛 Known Issues & TODOs

### Current Limitations
- In-memory queue system (Redis recommended for production)
- Basic video processing simulation
- No real-time notifications

### Future Enhancements
- [ ] Real-time notifications with Socket.io
- [ ] Advanced video processing with FFmpeg
- [ ] Recommendation algorithm
- [ ] Social features (follow/unfollow)
- [ ] Content moderation
- [ ] Advanced analytics dashboard

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation for detailed endpoint information

---

**Happy Coding! 🍕📱**
- ✅ Request logging (Morgan)
- ✅ Environment variables support
- ✅ Error handling
- ✅ Health check endpoint
- ✅ Development hot-reload

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration.

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build the TypeScript code
- `npm start` - Start the production server
- `npm test` - Run tests (when implemented)

## Development

To start the development server:

```bash
npm run dev
```

The server will start on http://localhost:3000 (or the port specified in your .env file).

## API Endpoints

### Health Check
- **GET** `/health` - Returns server health status

### API Base
- **GET** `/api` - Returns API information

## Project Structure

```
src/
├── index.ts          # Server initialization and startup
├── app.ts            # Express application setup and configuration
├── types/            # TypeScript type definitions
├── middleware/       # Custom middleware (ready for future use)
└── utils/            # Utility functions (ready for future use)
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CLIENT_URL` - Frontend URL for CORS

## Next Steps

The basic server setup is complete. You can now add:

- Controllers and routes
- Database integration
- Authentication middleware
- Validation
- Additional API endpoints

## Building for Production

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```
