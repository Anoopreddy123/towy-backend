import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { GeoService } from '../config/geo-services';

// Initialize repository after DataSource is ready
const userRepository = AppDataSource.getRepository(User);
const geoService = new GeoService();

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, latitude, longitude, businessName } = req.body;

        if (role === 'provider') {
            // Providers go to GeoService DB
            const provider = await geoService.registerProvider({
                email,
                password,
                businessName,
                latitude,
                longitude,
                services: ['towing']
            });
            res.status(201).json({ message: "Provider registered", provider });
        } else {
            // Regular users go to main DB
            const user = await userRepository.save({     
                name: req.body.name,
                email,
                password: await hash(password, 10),
                role: 'customer'
            });
            res.status(201).json({ message: "User registered", user });
        }
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role } = req.body;

        if (role === 'provider') {
            // Check GeoService DB for providers
            const provider = await geoService.loginProvider(email, password);
            res.json(provider);
        } else {
            // Check main DB for users
            const user = await userRepository.findOne({ where: { email } });
            console.log("User found:", user ? "Yes" : "No");
            console.log("Stored hashed password:", user?.password);
            console.log("Provided password:", password);
            
            if (!user) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }

            const validPassword = await compare(password, user.password);
            console.log("Password comparison result:", validPassword);

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
        }
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, role } = req.user; // From auth middleware

        if (role === 'provider') {
            // Get from GeoService DB
            const provider = await geoService.getProviderById(id);
            res.json(provider);
        } else {
            // Get from main DB
            const user = await userRepository.findOne({ where: { id } });
            res.json(user);
        }
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { id, role } = req.user;
        const updates = req.body;

        if (role === 'provider') {
            // Update in GeoService DB
            const provider = await geoService.updateProvider(id, updates);
            res.json(provider);
        } else {
            // Update in main DB
            const user = await userRepository.update(id, updates);
            res.json(user);
        }
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const loginProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const result = await geoService.loginProvider(email, password);
        
        // Structure the user data consistently
        const userData = {
            id: result.provider.id,
            name: result.provider.businessName, // Use businessName as the primary name
            email: result.provider.email,
            role: 'provider',
            businessName: result.provider.businessName,
            services: result.provider.services,
            location: result.provider.location,
            isAvailable: result.provider.isAvailable
        };

        const token = sign(
            { userId: userData.id, role: 'provider' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login successful",
            token,
            user: userData
        });
    } catch (error) {
        console.error('Provider login error:', error);
        res.status(401).json({ 
            message: error instanceof Error ? error.message : "Invalid credentials" 
        });
    }
}; 