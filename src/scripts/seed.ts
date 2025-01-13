import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { hash } from "bcrypt";

async function seed() {
    await AppDataSource.initialize();

    try {
        const userRepository = AppDataSource.getRepository(User);

        // Create test providers
        const providers = [
            {
                name: "Quick Towing Service",
                email: "anoopreddy51@gmail.com",
                password: await hash("password123", 10),
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
                password: await hash("password123", 10),
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
    } catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

seed(); 