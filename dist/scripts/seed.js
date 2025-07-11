"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const bcryptjs_1 = require("bcryptjs");
async function seed() {
    await database_1.AppDataSource.initialize();
    try {
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        // Create test providers
        const providers = [
            {
                name: "Quick Towing Service",
                email: "anoopreddy51@gmail.com",
                password: await (0, bcryptjs_1.hash)("password123", 10),
                role: "provider",
                location: { lat: 33.7701, lng: -118.1937 },
                services: ["towing", "battery_jump", "gas_delivery"],
                phoneNumber: "123-456-7890",
                businessName: "Quick Towing",
                isAvailable: true
            },
            {
                name: "Emergency Mechanic",
                email: "anoopreddy51+mechanic@gmail.com",
                password: await (0, bcryptjs_1.hash)("password123", 10),
                role: "provider",
                location: { lat: 33.7683, lng: -118.1956 },
                services: ["mechanic", "tire_change", "battery_jump"],
                phoneNumber: "123-456-7891",
                businessName: "Emergency Mechanic Services",
                isAvailable: true
            }
        ];
        for (const provider of providers) {
            const existingProvider = await userRepository.findOne({
                where: { email: provider.email }
            });
            if (!existingProvider) {
                await userRepository.save(provider);
                console.log(`Created provider: ${provider.name}`);
            }
        }
        console.log("Seed completed successfully");
    }
    catch (error) {
        console.error("Error seeding database:", error);
    }
    finally {
        await database_1.AppDataSource.destroy();
    }
}
seed();
