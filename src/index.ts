import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
// import { GeoService } from './config/geo-services';
import { userRouter } from "./routes/userRoutes";
import { serviceRouter } from "./routes/serviceRoutes";
import { authRouter } from "./routes/authRoutes";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Define CORS options
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

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Initialize database before setting up routes
console.log("Database URL:", process.env.DATABASE_URL);
AppDataSource.initialize()
    .then(() => { 
        console.log("Database connected");
        console.log("Loaded entities:", AppDataSource.entityMetadatas.map(e => e.name));
        
        // Temporarily disable GeoService initialization
        // try {
        //     new GeoService();
        // } catch (error) {
        //     console.error("GeoService initialization failed:", error);
        //     // Continue server startup even if GeoService fails
        // }

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'healthy' });
        });

        // Apply routes
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