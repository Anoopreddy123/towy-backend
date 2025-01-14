import { DataSource } from 'typeorm';
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";
import path from 'path';

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    logging: false,
    entities: [
        path.join(__dirname, '..', 'models', '*.{ts,js}'),
        User,
        ServiceRequest
    ],
    subscribers: [],
    migrations: []
}); 