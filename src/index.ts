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

        // Configure CORS
        const corsOptions = {
            origin: [
                "http://localhost:3000",
                "http://localhost:3001",
                "https://towy-ui.vercel.app",
                /\.vercel\.app$/
            ],
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept"],
            exposedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
            preflightContinue: false,
            optionsSuccessStatus: 204
        };

        app.use(cors(corsOptions));
        // used to populate the JSON from client in tothe request body.
        app.use(express.json());
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