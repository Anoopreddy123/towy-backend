import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";
import dotenv from 'dotenv';
dotenv.config();
console.log("Connecting to database:", process.env.DATABASE_URL); 

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


import { Provider } from "../entities/Provider";



export const GeoDataSource = new DataSource({
    type: "postgres",
    url: process.env.GEOSPATIAL_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }, // Connection string for geospatial database
    synchronize: true,
    entities: [Provider],
    logging: ["query", "error"],
});
