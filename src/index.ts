import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
import { GeoService } from './config/geo-services';
import { userRouter } from "./routes/userRoutes";
import { serviceRouter } from "./routes/serviceRoutes";
import { authRouter } from "./routes/authRoutes";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Initialize database before setting up routes
console.log("Database URL:", process.env.DATABASE_URL);
AppDataSource.initialize()
    .then(() => { 
        console.log("Database connected");
        console.log("Loaded entities:", AppDataSource.entityMetadatas.map(e => e.name));
        try {
            const geoService = new GeoService();
            //await geoService.initializeTables(); // Make sure tables are created
        } catch (error) {
            console.error("GeoService initialization failed:", error);
            // Continue app startup even if GeoService fails
        }

        // Define CORS options for different scenarios
        const corsOptions = {
            origin: [
                'https://towy-ui.vercel.app',
                'http://localhost:3000',
                /\.vercel\.app$/
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
            credentials: true,
            optionsSuccessStatus: 204
        };

        // Basic CORS for public routes
        const publicCors = cors({
            origin: '*',
            methods: ['GET', 'OPTIONS'],
            allowedHeaders: ['Content-Type']
        });

        // Secure CORS for authenticated routes
        const secureCors = cors(corsOptions);

        // Apply route-specific CORS
        app.use(express.json());

        // Public routes
        app.get('/health', publicCors, (req, res) => {
            res.json({ status: 'healthy' });
        });

        // Secure routes with specific CORS
        app.use('/auth/provider/login', secureCors);
        app.use('/auth/login', secureCors);
        app.use('/auth/signup', secureCors);
        app.use('/services', secureCors);
        app.use('/users', secureCors);

        // Handle OPTIONS preflight requests
        app.options('*', secureCors);

        // Your existing route handlers
        app.use("/auth", authRouter);
        app.use("/users", userRouter);
        app.use("/services", serviceRouter);

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error: any) => {
        console.error("Database connection error:", error);
        process.exit(1);
    });