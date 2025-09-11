import { Request, Response } from 'express';
import { AppDataSource, simpleDbPool } from '../config/database';
import { User } from '../models/User';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { GeoService } from '../config/geo-services';

// Initialize repository after DataSource is ready
let userRepository: any = null;
let geoService: any = null;

// Initialize repositories when database is ready
function initializeRepositories() {
    if (AppDataSource.isInitialized) {
        userRepository = AppDataSource.getRepository(User);
        geoService = new GeoService();
    }
}

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, latitude, longitude, businessName, name } = req.body;

        if (role === 'provider') {
            // Providers go to GeoService DB
            if (!geoService) {
                geoService = new GeoService();
            }
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
            // Regular users go to main DB using direct connection
            const hashedPassword = await hash(password, 10);
            
            const client = await simpleDbPool.connect();
            try {
                // Check if user already exists
                const existingUser = await client.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );
                
                if (existingUser.rows.length > 0) {
                    res.status(400).json({ error: "User already exists" });
                    return;
                }
                
                // Insert new user
                const result = await client.query(
                    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
                    [name, email, hashedPassword, 'customer']
                );
                
                const user = result.rows[0];
                const { password: _, ...userWithoutPassword } = user;
                
                res.status(201).json({ 
                    message: "User registered successfully", 
                    user: userWithoutPassword 
                });
            } finally {
                client.release();
            }
        }
    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            error: "Database error. Please try again later." 
        });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role } = req.body;

        if (role === 'provider') {
            // Check GeoService DB for providers
            if (!geoService) {
                geoService = new GeoService();
            }
            const provider = await geoService.loginProvider(email, password);
            res.json(provider);
        } else {
            // Check main DB for users using direct connection
            const client = await simpleDbPool.connect();
            try {
                const result = await client.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );
                
                const user = result.rows[0];
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
                    process.env.JWT_SECRET || "your_secret_key",
                    { expiresIn: "24h" }
                );

                const { password: _, ...userWithoutPassword } = user;

                res.json({
                    message: "Login successful",
                    token,
                    user: userWithoutPassword
                });
            } finally {
                client.release();
            }
        }
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: "Database error. Please try again later." 
        });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, role } = req.user; // From auth middleware

        if (role === 'provider') {
            // Get from GeoService DB
            if (!geoService) {
                geoService = new GeoService();
            }
            const provider = await geoService.getProviderById(id);
            res.json(provider);
        } else {
            // Get from main DB using direct connection
            const client = await simpleDbPool.connect();
            try {
                const result = await client.query(
                    'SELECT id, name, email, role FROM users WHERE id = $1',
                    [id]
                );
                
                const user = result.rows[0];
                if (!user) {
                    res.status(404).json({ error: "User not found" });
                    return;
                }
                
                res.json(user);
            } finally {
                client.release();
            }
        }
    } catch (error: any) {
        console.error('Get current user error:', error);
        res.status(500).json({ 
            error: "Database error. Please try again later." 
        });
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
        
        if (!geoService) {
            geoService = new GeoService();
        }
        
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
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login successful",
            token,
            user: userData
        });
    } catch (error: any) {
        console.error('Provider login error:', error);
        res.status(401).json({ 
            message: error instanceof Error ? error.message : "Invalid credentials" 
        });
    }
}; 