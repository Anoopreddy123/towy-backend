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
const NotificationEventHandler_1 = require("./events/NotificationEventHandler");
const EventBus_1 = require("./events/EventBus");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// CRITICAL: Bypass SSL validation for PostgreSQL connections in serverless environments
process.env.PGSSLMODE = 'no-verify';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
// Event system test endpoint
app.get('/test-events', async (req, res) => {
    try {
        const stats = EventBus_1.eventBus.getEventStats();
        const testResult = await NotificationEventHandler_1.notificationEventHandler.testNotificationSystem();
        // Test event emission
        console.log('Testing event emission...');
        EventBus_1.eventBus.emitEvent({
            id: 'test-event-' + Date.now(),
            type: 'service_request_created',
            timestamp: new Date(),
            data: {
                requestId: 'test-request-123',
                userId: 'test-user-123',
                serviceType: 'towing',
                location: 'Test Location',
                coordinates: { lat: 40.7128, lng: -74.0060 },
                description: 'Test request',
                vehicleType: 'Sedan'
            }
        });
        res.json({
            message: 'Event system test completed',
            eventBus: stats,
            notificationSystem: testResult ? 'working' : 'has issues',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Event system test failed',
            error: error.message
        });
    }
});
// Database test endpoint
app.get('/db-test', async (req, res) => {
    try {
        if (database_1.AppDataSource.isInitialized) {
            const entities = database_1.AppDataSource.entityMetadatas && Array.isArray(database_1.AppDataSource.entityMetadatas)
                ? database_1.AppDataSource.entityMetadatas.map(e => e.name)
                : [];
            res.json({
                status: 'connected',
                message: 'Database is connected',
                entities: entities
            });
        }
        else {
            res.json({
                status: 'not_connected',
                message: 'Database is not connected',
                error: 'Database initialization failed'
            });
        }
    }
    catch (error) {
        res.json({
            status: 'error',
            message: 'Database test failed',
            error: error.message
        });
    }
});
// Simple database connection test
app.get('/simple-db-test', async (req, res) => {
    try {
        const client = await database_1.simpleDbPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({
            status: 'connected',
            message: 'Simple database connection works',
            timestamp: result.rows[0].now
        });
    }
    catch (error) {
        res.json({
            status: 'error',
            message: 'Simple database connection failed',
            error: error.message
        });
    }
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
        const entities = database_1.AppDataSource.entityMetadatas && Array.isArray(database_1.AppDataSource.entityMetadatas)
            ? database_1.AppDataSource.entityMetadatas.map(e => e.name)
            : [];
        console.log("Loaded entities:", entities);
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
// Initialize event system
async function initializeEventSystem() {
    try {
        console.log("Initializing event-driven architecture...");
        // Initialize notification event handler (this sets up event listeners)
        const handler = NotificationEventHandler_1.notificationEventHandler;
        console.log("Notification event handler initialized");
        // Test the notification system
        const testResult = await handler.testNotificationSystem();
        if (testResult) {
            console.log("✅ Event-driven notification system is ready");
        }
        else {
            console.warn("⚠️ Event-driven notification system has issues but will continue");
        }
        // Log event bus stats
        const stats = EventBus_1.eventBus.getEventStats();
        console.log("Event bus stats:", stats);
    }
    catch (error) {
        console.error("Failed to initialize event system:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack
        });
        // Don't exit - let server continue
    }
}
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Initialize database and event system after server starts
    initializeDatabase().then(() => {
        initializeEventSystem();
    });
});
