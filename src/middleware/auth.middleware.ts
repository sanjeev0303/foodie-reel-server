import { Request, Response, NextFunction } from "express"
import jwt from 'jsonwebtoken'
import * as conf from "../config/env.config"
import { foodPartnerModel } from "../models/food-partner.model";
import { userModel } from "../models/user.model";

// Extend Request interface to include custom properties
declare global {
    namespace Express {
        interface Request {
            foodPartner?: any;
            user?: any;
        }
    }
}

// Define JWT payload interface
interface JwtPayload {
    id: string;
    iat?: number;
    exp?: number;
}

function extractToken(req: Request): string | null {
    const cookieToken = req.cookies?.token as string | undefined
    if (cookieToken) return cookieToken
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring('Bearer '.length)
    }
    return null
}

async function authFoodPartnerMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // In development, skip auth if no database connection
    if (process.env.NODE_ENV === 'development') {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ Development mode: Skipping food partner auth due to no database connection');
            req.foodPartner = { _id: 'dev-partner-id', name: 'Development Partner' };
            next();
            return;
        }
    }

    const token = extractToken(req);

    if (!token) {
        res.status(401).json({
            message: "Please login first"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, conf.JWT_SECRET!) as JwtPayload;
        const foodPartner = await foodPartnerModel.findById(decoded.id);

        req.foodPartner = foodPartner;
        next();
    } catch (err) {
        res.status(401).json({
            message: "Invalid token"
        });
        return;
    }
}

async function authUserMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // In development, skip auth if no database connection
    if (process.env.NODE_ENV === 'development') {
        // Check if mongoose is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ Development mode: Skipping auth due to no database connection');
            // Create a mock user for development
            req.user = { _id: 'dev-user-id', fullName: 'Development User' };
            next();
            return;
        }
    }

    const token = extractToken(req);

    if (!token) {
        res.status(401).json({
            message: "Please login first"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, conf.JWT_SECRET!) as JwtPayload;
        const user = await userModel.findById(decoded.id);

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({
            message: "Invalid token"
        });
        return;
    }
}

export {
    authFoodPartnerMiddleware,
    authUserMiddleware
};
