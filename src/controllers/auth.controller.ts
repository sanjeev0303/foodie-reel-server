import { Request, Response } from 'express'
import { userModel } from '../models/user.model'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as conf from "../config/env.config"
import { foodPartnerModel } from '../models/food-partner.model'

const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, password } = req.body

        const isUserAlreadyExists = await userModel.findOne({
            email
        })

        if (isUserAlreadyExists) {
            res.status(400).json({
                message: "User already exists"
            })
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            fullName,
            email,
            password: hashedPassword
        })

        const token = jwt.sign({
            id: user._id,
        }, conf.JWT_SECRET!)

        res.cookie('token', token)

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        })
    } catch (error) {
        console.error('Register user error:', error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error
        })
    }
}

const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body

        const user = await userModel.findOne({
            email
        })

        if (!user) {
            res.status(400).json({
                message: "Invalid email or password"
            })
            return
        }

        const isPassword = await bcrypt.compare(password, user.password)

        if (!isPassword) {
            res.status(400).json({
                message: "Invalid email or password"
            })
            return
        }

        const token = jwt.sign({
            id: user._id
        }, conf.JWT_SECRET!)

        res.cookie('token', token)

        res.status(200).json({
            message: "User logged in successfully",
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName
            },
            token: token
        })
    } catch (error) {
        console.error('Login user error:', error);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

const logoutUser = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('token');
        res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (error) {
        console.error('Error in logoutUser:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

const registerFoodPartner = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Registration request body:', req.body);
        console.log('JWT_SECRET available:', !!conf.JWT_SECRET);

        const { name, email, password, phone, address, contactName } = req.body

        // If contactName is not provided, use name as contactName (for frontend compatibility)
        const finalContactName = contactName || name;

        // Validate required fields
        if (!name || !email || !password || !phone || !address) {
            res.status(400).json({
                message: "All fields are required",
                missingFields: {
                    name: !name,
                    email: !email,
                    password: !password,
                    phone: !phone,
                    address: !address
                }
            });
            return;
        }

        console.log('Checking for existing account...');
        const isAccountAlreadyExists = await foodPartnerModel.findOne({
            email
        })

        if (isAccountAlreadyExists) {
            console.log('Account already exists for email:', email);
            res.status(400).json({
                message: "Food partner account already exists"
            })
            return
        }

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10)

        console.log('Creating food partner...');
        const foodPartner = await foodPartnerModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
            contactName: finalContactName
        })

        console.log('Food partner created:', foodPartner._id);

        if (!conf.JWT_SECRET) {
            console.error('JWT_SECRET is not defined!');
            res.status(500).json({
                message: "Server configuration error"
            });
            return;
        }

        console.log('Generating JWT token...');
        const token = jwt.sign({
            id: foodPartner._id
        }, conf.JWT_SECRET!)

        res.cookie('token', token)

        console.log('Registration successful for:', email);
        res.status(201).json({
            message: "Food partner registered successfully",
            foodPartner: {
                _id: foodPartner._id,
                email: foodPartner.email,
                name: foodPartner.name,
                address: foodPartner.address,
                contactName: foodPartner.contactName,
                phone: foodPartner.phone
            }
        })
    } catch (error) {
        console.error('Register food partner error:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

const loginFoodPartner = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const foodPartner = await foodPartnerModel.findOne({
            email
        })

        if (!foodPartner) {
            res.status(400).json({
                message: "Invalid email or password"
            })
            return
        }

        const isPasswordValid = await bcrypt.compare(password, foodPartner.password);

        if (!isPasswordValid) {
            res.status(400).json({
                message: "Invalid email or password"
            })
            return
        }

        const token = jwt.sign({
            id: foodPartner._id,
        }, conf.JWT_SECRET!)

        res.cookie("token", token)

        res.status(200).json({
            message: "Food partner logged in successfully",
            foodPartner: {
                _id: foodPartner._id,
                email: foodPartner.email,
                name: foodPartner.name
            },
            token: token
        })
    } catch (error) {
        console.error('Login food partner error:', error);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

const logoutFoodPartner = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('token');
        res.status(200).json({
            message: 'Food partner logged out successfully'
        });
    } catch (error) {
        console.error('Error in logoutFoodPartner:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}



export {
    registerUser,
    loginUser,
    logoutUser,
    registerFoodPartner,
    loginFoodPartner,
    logoutFoodPartner
}
