import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';

// Initialize repository after DataSource is ready
const userRepository = AppDataSource.getRepository(User);

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        // Wait for DataSource to be initialized
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const { 
            name, 
            email, 
            password, 
            role,
            businessName,
            phoneNumber,
            services 
        } = req.body;

        const existingUser = await userRepository.findOne({ 
            where: { email } 
        });

        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        const hashedPassword = await hash(password, 10);

        const user = userRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            ...(role === "provider" && {
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
        console.error("Signup error:", error);
        res.status(500).json({ message: "Error creating user" });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const { email, password, role } = req.body;
        console.log("Login attempt:", { email, role });

        const user = await userRepository.findOne({ 
            where: { 
                email,
                ...(role && { role })
            },
            select: [
                "id",
                "email",
                "password",  // Make sure password is selected
                "name",
                "role",
                "businessName",
                "phoneNumber",
                "services",
                "location",
                "isAvailable"
            ]
        });

        console.log("User found:", user ? "Yes" : "No");
        
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const validPassword = await compare(password, user.password);
        console.log("Password valid:", validPassword);

        if (!validPassword) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const token = sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: "Login successful",
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("Login error details:", error);
        res.status(500).json({ 
            message: "Error during login",
            error: error.message  // Include error message for debugging
        });
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