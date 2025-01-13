import { DataSource } from 'typeorm';
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL || "postgresql://towy_db_owner:iDMY39zGtgOr@ep-spring-unit-a58d260q.us-east-2.aws.neon.tech/towy_db?sslmode=require",
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    logging: false,
    entities: [User, ServiceRequest],
    subscribers: [],
    migrations: []
}) 