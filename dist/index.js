"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const userRoutes_1 = require("./routes/userRoutes");
const serviceRoutes_1 = require("./routes/serviceRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)(corsOptions));
// Parse JSON bodies
app.use(express_1.default.json());
// Health check endpoint (always available)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Server is running' });
});
// Test endpoint (always available)
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});
// Always register routes (they will handle database errors internally)
app.use("/auth", authRoutes_1.authRouter);
app.use("/users", userRoutes_1.userRouter);
app.use("/services", serviceRoutes_1.serviceRouter);
// Initialize database
async function initializeDatabase() {
    try {
        console.log("Database URL:", process.env.DATABASE_URL);
        console.log("Starting database initialization...");
        await database_1.AppDataSource.initialize();
        console.log("Database connected successfully");
        console.log("Loaded entities:", database_1.AppDataSource.entityMetadatas.map(e => e.name));
        console.log("Database is ready");
    }
    catch (error) {
        console.error("Failed to initialize database:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        // Don't exit - let server continue with basic endpoints
    }
}
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Initialize database after server starts
    initializeDatabase();
});
