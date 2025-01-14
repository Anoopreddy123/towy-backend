import { DataSource } from 'typeorm';
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    logging: true,
    entities: [User, ServiceRequest],
    migrationsRun: true,
    extra: {
        ssl: true
    }
}); 