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

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://towy-ui.vercel.app',
        /\.vercel\.app$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Database initialization
const initializeDB = async () => {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");
        console.log("Loaded entities:", AppDataSource.entityMetadatas.map(e => e.name));
        try {
            const geoService = new GeoService();
            //await geoService.initializeTables(); // Make sure tables are created
        } catch (error) {
            console.error("GeoService initialization failed:", error);
            // Continue app startup even if GeoService fails
        }
    } catch (error) {
        console.error("Database connection error:", error);
        throw error;
    }
};

// Routes
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/services", serviceRouter);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
});

// Initialize DB and start server for local development
if (process.env.NODE_ENV !== 'production') {
    initializeDB().then(() => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    });
}

// For Vercel deployment
export default async function handler(req: any, res: any) {
    try {
        if (!AppDataSource.isInitialized) {
            await initializeDB();
        }
        return app(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}