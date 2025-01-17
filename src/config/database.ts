import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";

console.log("Connecting to database:", process.env.DATABASE_URL?.split("@")[1]); // Log only the host part for security

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    entities: [User, ServiceRequest],
    migrationsRun: true,
    logging: true,
    extra: {
        ssl: true
    }
});

// Don't initialize here - we'll do it in index.ts 