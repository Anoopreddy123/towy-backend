"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geo_services_1 = require("../config/geo-services");
async function seedGeoProviders() {
    var _a;
    const geoService = new geo_services_1.GeoService();
    try {
        console.log('Seeding providers into geospatial database...');
        // Test providers near Long Beach, California (where the service request is)
        const providers = [
            {
                email: "quicktowing@example.com",
                password: "password123",
                businessName: "Quick Towing Service",
                latitude: 33.7701,
                longitude: -118.1937,
                services: ["towing", "battery_jump", "gas_delivery"]
            },
            {
                email: "emergencymechanic@example.com",
                password: "password123",
                businessName: "Emergency Mechanic Services",
                latitude: 33.7683,
                longitude: -118.1956,
                services: ["mechanic", "tire_change", "battery_jump"]
            },
            {
                email: "longbeachauto@example.com",
                password: "password123",
                businessName: "Long Beach Auto Rescue",
                latitude: 33.7908,
                longitude: -118.1353,
                services: ["towing", "roadside_assistance", "lockout"]
            },
            {
                email: "coastaltowing@example.com",
                password: "password123",
                businessName: "Coastal Towing & Recovery",
                latitude: 33.7750,
                longitude: -118.1400,
                services: ["towing", "vehicle_recovery", "gas_delivery"]
            }
        ];
        for (const provider of providers) {
            try {
                const result = await geoService.registerProvider(provider);
                console.log(`✓ Created provider: ${provider.businessName} (${result.id})`);
            }
            catch (error) {
                if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) || error.code === '23505') {
                    console.log(`- Provider already exists: ${provider.businessName}`);
                }
                else {
                    console.error(`✗ Failed to create provider ${provider.businessName}:`, error.message);
                }
            }
        }
        console.log('Provider seeding completed!');
        // Test the findNearbyProviders function
        console.log('\nTesting nearby providers search...');
        const nearbyProviders = await geoService.findNearbyProviders(33.7908, -118.1353, 10, 'towing');
        console.log(`Found ${nearbyProviders.length} nearby providers:`, nearbyProviders);
    }
    catch (error) {
        console.error('Error seeding geospatial providers:', error);
    }
}
seedGeoProviders();
