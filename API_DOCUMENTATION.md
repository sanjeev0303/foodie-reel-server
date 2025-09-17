# Zomato Reels API Documentation

## Overview
A comprehensive backend API for a TikTok-style reel scrolling application focused on food content. Built with TypeScript, Express.js, MongoDB, and includes real-time video streaming optimization.

## Base URL
```
http://localhost:5000/api
```

## Authentication
The API uses JWT (JSON Web Token) authentication with two user types:
- **Users**: Regular users who can view, like, save, and comment on reels
- **Food Partners**: Content creators who can upload and manage food reels

### Authentication Headers
```
Authorization: Bearer <token>
Cookie: token=<jwt_token>
```

## API Endpoints

### 🔐 Authentication Endpoints

#### POST `/auth/register/user`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "64a1b2c3d4e5f6789",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true
  }
}
```

#### POST `/auth/register/food-partner`
Register a new food partner account.

**Request Body:**
```json
{
  "name": "Pizza Palace",
  "email": "owner@pizzapalace.com",
  "password": "securePassword123",
  "address": "123 Main St, City",
  "phone": "+1234567890"
}
```

#### POST `/auth/login/user`
Login as a user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "64a1b2c3d4e5f6789",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/auth/login/food-partner`
Login as a food partner.

#### POST `/auth/logout`
Logout (clear authentication token).

---

### 🎥 Reel Management Endpoints

#### POST `/food/`
Create a new food reel (Food Partner only).

**Authentication:** Food Partner required

**Content-Type:** `multipart/form-data`

**Request:**
```
name: "Delicious Margherita Pizza"
description: "Fresh mozzarella, basil, and tomato sauce on crispy crust"
restaurantAddress: "123 Pizza Street, Downtown"
tags: "pizza,italian,vegetarian"
duration: 45
video: [video file]
```

**Response (201):**
```json
{
  "message": "Reel created successfully",
  "food": {
    "_id": "64a1b2c3d4e5f6789",
    "name": "Delicious Margherita Pizza",
    "description": "Fresh mozzarella, basil, and tomato sauce on crispy crust",
    "restaurantAddress": "123 Pizza Street, Downtown",
    "video": "https://storage.example.com/video123.mp4",
    "thumbnail": "https://storage.example.com/thumbnail123.jpg",
    "tags": ["pizza", "italian", "vegetarian"],
    "duration": 45,
    "viewsCount": 0,
    "likesCount": 0,
    "commentsCount": 0,
    "savesCount": 0,
    "foodPartner": "64a1b2c3d4e5f6789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/food/`
Get all reels with pagination and filtering.

**Authentication:** User required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `tags`: Filter by tags (comma-separated)
- `foodPartner`: Filter by food partner ID

**Response (200):**
```json
{
  "message": "Foods fetched successfully",
  "foods": [
    {
      "_id": "64a1b2c3d4e5f6789",
      "name": "Delicious Margherita Pizza",
      "description": "Fresh mozzarella, basil, and tomato sauce",
      "restaurantAddress": "123 Pizza Street, Downtown",
      "video": "https://storage.example.com/video123.mp4",
      "thumbnail": "https://storage.example.com/thumbnail123.jpg",
      "tags": ["pizza", "italian", "vegetarian"],
      "duration": 45,
      "viewsCount": 150,
      "likesCount": 25,
      "commentsCount": 8,
      "savesCount": 12,
      "foodPartner": {
        "_id": "64a1b2c3d4e5f6789",
        "name": "Pizza Palace"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalFoods": 47,
    "hasNext": true
  }
}
```

#### DELETE `/food/:foodId`
Delete a reel (Food Partner who created it only).

**Authentication:** Food Partner required

**Response (200):**
```json
{
  "message": "Reel deleted successfully"
}
```

#### GET `/food/partner/reels`
Get reels created by the authenticated food partner.

**Authentication:** Food Partner required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

---

### ❤️ User Interaction Endpoints

#### POST `/food/like`
Like or unlike a reel.

**Authentication:** User required

**Request Body:**
```json
{
  "foodId": "64a1b2c3d4e5f6789"
}
```

**Response (200/201):**
```json
{
  "message": "Food liked successfully",
  "isLiked": true
}
```

#### POST `/food/save`
Save or unsave a reel.

**Authentication:** User required

**Request Body:**
```json
{
  "foodId": "64a1b2c3d4e5f6789"
}
```

#### GET `/food/save`
Get user's saved reels.

**Authentication:** User required

**Response (200):**
```json
{
  "message": "Saved foods fetched successfully",
  "savedFoods": [
    {
      "_id": "64a1b2c3d4e5f6789",
      "food": {
        "_id": "64a1b2c3d4e5f6789",
        "name": "Delicious Margherita Pizza",
        "video": "https://storage.example.com/video123.mp4",
        "foodPartner": {
          "name": "Pizza Palace"
        }
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET `/food/liked`
Get user's liked reels.

**Authentication:** User required

#### POST `/food/:foodId/view`
Record a view for analytics.

**Authentication:** User required

**Request Body:**
```json
{
  "viewDuration": 30,
  "deviceInfo": "iPhone 15, iOS 17.1"
}
```

---

### 💬 Comment System Endpoints

#### POST `/comments/:foodId`
Add a comment to a reel.

**Authentication:** User required

**Request Body:**
```json
{
  "content": "This looks absolutely delicious! 🍕"
}
```

**Response (201):**
```json
{
  "message": "Comment created successfully",
  "comment": {
    "_id": "64a1b2c3d4e5f6789",
    "content": "This looks absolutely delicious! 🍕",
    "user": {
      "_id": "64a1b2c3d4e5f6789",
      "name": "John Doe"
    },
    "food": "64a1b2c3d4e5f6789",
    "likesCount": 0,
    "repliesCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/comments/:foodId`
Get comments for a reel.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200):**
```json
{
  "message": "Comments fetched successfully",
  "comments": [
    {
      "_id": "64a1b2c3d4e5f6789",
      "content": "This looks absolutely delicious! 🍕",
      "user": {
        "_id": "64a1b2c3d4e5f6789",
        "name": "John Doe"
      },
      "likesCount": 5,
      "repliesCount": 2,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "replies": [
        {
          "_id": "64a1b2c3d4e5f6790",
          "content": "I agree! Can't wait to try it",
          "user": {
            "_id": "64a1b2c3d4e5f6791",
            "name": "Jane Smith"
          },
          "createdAt": "2024-01-15T10:35:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalComments": 45,
    "hasNext": true
  }
}
```

#### DELETE `/comments/:commentId`
Delete a comment (user who created it only).

**Authentication:** User required

#### POST `/comments/:commentId/like`
Like or unlike a comment.

**Authentication:** User required

---

### 📊 Admin & Analytics Endpoints

#### GET `/food/admin/queue-stats`
Get queue processing statistics (Food Partner only).

**Authentication:** Food Partner required

**Response (200):**
```json
{
  "message": "Queue statistics fetched successfully",
  "stats": {
    "videoProcessing": {
      "total": 25,
      "pending": 3,
      "processing": 1,
      "completed": 20,
      "failed": 1,
      "isProcessing": true
    },
    "videoStreaming": {
      "total": 45,
      "pending": 5,
      "processing": 2,
      "completed": 38,
      "failed": 0,
      "isProcessing": true
    },
    "analytics": {
      "total": 156,
      "pending": 12,
      "processing": 3,
      "completed": 141,
      "failed": 0,
      "isProcessing": true
    }
  }
}
```

#### GET `/status/database`
Check database connection status.

**Response (200):**
```json
{
  "database": {
    "isConnected": true,
    "host": "localhost:27017",
    "name": "zomato-reels"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "message": "Validation error message",
  "error": "Detailed error information"
}
```

**401 Unauthorized:**
```json
{
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "message": "You don't have permission to perform this action"
}
```

**404 Not Found:**
```json
{
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "message": "Internal server error",
  "error": "Error details (in development mode)"
}
```

---

## File Upload Guidelines

### Video Upload Requirements
- **Supported formats:** MP4, MPEG, QuickTime, AVI
- **Maximum file size:** 100MB
- **Recommended duration:** 15-60 seconds
- **Recommended resolution:** 1080x1920 (9:16 aspect ratio)

### Upload Process
1. Videos are uploaded to cloud storage (ImageKit)
2. Video processing job is queued for compression and optimization
3. Thumbnail generation is handled automatically
4. Analytics tracking begins immediately upon upload

---

## Queue Management

The application uses an intelligent queue system for handling high traffic:

### Queue Types
- **Video Processing Queue:** Handles video compression, thumbnail generation
- **Video Streaming Queue:** Optimizes video delivery based on user quality preferences
- **Analytics Queue:** Processes user interaction data for insights

### Queue Priorities
- High quality video streaming: Priority 1
- Medium quality video streaming: Priority 2
- Low quality video streaming: Priority 3
- Video processing: Priority 1-5 (based on compression level)
- Analytics processing: Priority 10 (lowest)

---

## Rate Limiting

- **Authentication endpoints:** 5 requests per minute
- **Video upload:** 3 uploads per hour per food partner
- **Comments:** 30 comments per hour per user
- **Likes/Saves:** 100 actions per hour per user

---

## Development Setup

1. **Clone repository**
2. **Install dependencies:** `npm install`
3. **Set environment variables:**
   ```env
   MONGO_URI=mongodb://localhost:27017/zomato-reels
   JWT_SECRET=your-secret-key
   IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
   IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
   IMAGEKIT_URL_ENDPOINT=your-imagekit-url
   ```
4. **Start development server:** `npm run dev`

---

## Production Deployment

### Redis Setup (Recommended for Production)
For production deployment, replace the in-memory queue with Redis + BullMQ:

1. **Install Redis:**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server

   # macOS
   brew install redis
   ```

2. **Start Redis:**
   ```bash
   redis-server
   ```

3. **Update environment variables:**
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **Replace queue service implementation** with the commented Redis version in `src/services/queue.service.ts`

### Performance Optimization
- Use CDN for video delivery
- Implement video caching strategies
- Set up load balancing for multiple server instances
- Enable database indexing for frequent queries
- Monitor queue performance and adjust worker counts

---

## Support

For questions or issues, please contact the development team or create an issue in the project repository.
