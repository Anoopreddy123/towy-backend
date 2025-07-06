import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
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

// Health check endpoint (always available)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Server is running' });
});

// Test endpoint (always available)
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Always register routes (they will handle database errors internally)
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/services", serviceRouter);

// Initialize database
async function initializeDatabase() {
    try {
        console.log("Database URL:", process.env.DATABASE_URL);
        await AppDataSource.initialize();
        console.log("Database connected");
        console.log("Loaded entities:", AppDataSource.entityMetadatas.map(e => e.name));
    } catch (error) {
        console.error("Failed to initialize database:", error);
        // Don't exit - let server continue with basic endpoints
    }
}

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Initialize database after server starts
    initializeDatabase();
});