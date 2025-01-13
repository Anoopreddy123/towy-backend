import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';

const userRepository = AppDataSource.getRepository(User);

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            name, 
            email, 
            password, 
            role,
            businessName,
            phoneNumber,
            services 
        } = req.body;

        // Check if user already exists
        const existingUser = await userRepository.findOne({ 
            where: { email } 
        });

        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        const hashedPassword = await hash(password, 10);

        // Create user with conditional provider fields
        const user = userRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            ...(role === 'provider' && {
                businessName,
                phoneNumber,
                services: services ? [services] : [],
                isAvailable: true
            })
        });

        await userRepository.save(user);

        res.status(201).json({
            message: "User created successfully"
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: "Error creating user" });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role } = req.body;
        
        const user = await userRepository.findOne({ 
            where: { 
                email,
                ...(role && { role })
            },
            select: [
                'id',
                'email', 
                'password',
                'name',
                'role',
                'businessName',
                'phoneNumber',
                'services',
                'location',
                'isAvailable'
            ]
        });

        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const validPassword = await compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const token = sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: "Login successful",
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: "Error during login" });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await userRepository.findOne({
            where: { id: req.user.id },
            select: ['id', 'email', 'name', 'role', 'businessName', 'phoneNumber', 'services', 'location', 'isAvailable']
        });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ message: "Error fetching user" });
    }
}; 