import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
import { userRouter } from "./routes/userRoutes";
import { serviceRouter } from "./routes/serviceRoutes";
import { authRouter } from "./routes/authRoutes";

const app = express();
const port = process.env.PORT || 4000;

// Initialize database before setting up routes
AppDataSource.initialize()
    .then(() => {
        console.log("Database connected");
        console.log("Loaded entities:", AppDataSource.entityMetadatas.map(e => e.name));
        
        // Configure CORS
        const corsOptions = {
            origin: [
                "http://localhost:3000",
                "https://towy-ui.vercel.app",
                /\.vercel\.app$/
            ],
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        };

        app.use(cors(corsOptions));
        app.use(express.json());
        app.use("/auth", authRouter);
        app.use("/users", userRouter);
        app.use("/services", serviceRouter);

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error("Database connection error:", error);
    }); 