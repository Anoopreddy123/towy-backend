import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";

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