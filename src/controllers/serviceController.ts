import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ServiceRequest, ServiceType } from '../models/ServiceRequest';
import { User } from '../models/User';

const serviceRepository = AppDataSource.getRepository(ServiceRequest);
const userRepository = AppDataSource.getRepository(User);

export const createServiceRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceType, location, coordinates, description, vehicleType } = req.body;
        console.log('Creating service request with:', { serviceType, location, coordinates });

        // Validate service type
        if (!Object.values(ServiceType).includes(serviceType)) {
            res.status(400).json({ message: "Invalid service type" });
            return;
        }

        const service = serviceRepository.create({
            serviceType,
            location,
            coordinates,
            description,
            vehicleType,
            status: "pending",
            user: req.user
        });

        await serviceRepository.save(service);
        res.status(201).json({ message: 'Service request created', service });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ message: "Error creating service request" });
    }
};

export const getAvailableProviders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceType } = req.query;
        const providers = await userRepository
            .createQueryBuilder("user")
            .where("user.role = :role", { role: "provider" })
            .andWhere("user.services @> ARRAY[:serviceType]", { serviceType })
            .getMany();

        res.json(providers);
    } catch (error) {
        res.status(500).json({ message: "Error finding service providers" });
    }
};

export const getUserRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const requests = await serviceRepository.find({
            where: { user: { id: req.user.id } },
            order: { createdAt: 'DESC' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching service requests" });
    }
};

export const updateServiceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const service = await serviceRepository.findOne({ 
            where: { id },
            relations: ['user']
        });

        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }

        service.status = status;
        await serviceRepository.save(service);
        res.json({ message: "Status updated", service });
    } catch (error) {
        res.status(500).json({ message: "Error updating service status" });
    }
};

// Add endpoint for providers to submit quotes
export const submitQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const { quotedPrice } = req.body;

        const service = await serviceRepository.findOne({ 
            where: { id: serviceId }
        });

        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }

        service.quotedPrice = quotedPrice;
        service.provider = req.user;
        await serviceRepository.save(service);

        res.json({ message: "Quote submitted successfully", service });
    } catch (error) {
        res.status(500).json({ message: "Error submitting quote" });
    }
};

// Get all quotes for a service request
export const getServiceQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const service = await serviceRepository.findOne({
            where: { id: serviceId },
            relations: ['provider']
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: "Error fetching quotes" });
    }
};

// Accept a quote
export const acceptQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const { providerId } = req.body;

        const service = await serviceRepository.findOne({
            where: { id: serviceId }
        });

        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }

        service.status = "accepted";
        service.provider = { id: providerId } as User;
        await serviceRepository.save(service);

        res.json({ message: "Quote accepted", service });
    } catch (error) {
        res.status(500).json({ message: "Error accepting quote" });
    }
};

// Get provider's active services
export const getProviderServices = async (req: Request, res: Response): Promise<void> => {
    try {
        const services = await serviceRepository.find({
            where: { provider: { id: req.user.id } },
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: "Error fetching provider services" });
    }
};

// Add this function to find nearby providers
export const findNearbyProviders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latitude, longitude, serviceType } = req.query;

        if (!latitude || !longitude || !serviceType) {
            res.status(400).json({ 
                message: "Missing required parameters",
                required: { latitude, longitude, serviceType }
            });
            return;
        }

        console.log('Finding providers with params:', { latitude, longitude, serviceType });

        const providers = await userRepository
            .createQueryBuilder("user")
            .where("user.role = :role", { role: "provider" })
            .andWhere("user.isAvailable = :isAvailable", { isAvailable: true })
            .getMany();

        console.log('Found providers:', providers);

        if (!providers.length) {
            res.json([]);
            return;
        }

        const nearbyProviders = providers
            .filter(provider => {
                if (!provider.location) {
                    console.log(`Provider ${provider.name} has no location`);
                    return false;
                }
                return true;
            })
            .map(provider => {
                const distance = calculateDistance(
                    Number(latitude),
                    Number(longitude),
                    provider.location!.lat,
                    provider.location!.lng
                );
                console.log(`Provider ${provider.name} is ${distance}km away`);
                return { ...provider, password: undefined, distance };
            })
            .filter(provider => {
                const isNearby = provider.distance <= 50;
                const hasService = provider.services?.includes(serviceType as string);
                console.log(`Provider ${provider.name}: nearby=${isNearby}, hasService=${hasService}`);
                return isNearby && hasService;
            })
            .sort((a, b) => a.distance - b.distance);

        console.log('Returning providers:', nearbyProviders);
        res.json(nearbyProviders);
    } catch (error) {
        console.error('Error finding providers:', error);
        res.status(500).json({ 
            message: "Error finding nearby providers",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

export const notifyProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const { requestId, providerId } = req.body;
        
        const service = await serviceRepository.findOne({
            where: { id: requestId }
        });

        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }

        // Add the provider to notified providers list
        service.notifiedProviders = [...(service.notifiedProviders || []), providerId];
        await serviceRepository.save(service);

        res.json({ message: "Provider notified successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error notifying provider" });
    }
};

export const getServiceRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const service = await serviceRepository.findOne({
            where: { id },
            relations: ['user']
        });

        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }

        console.log('Found service request:', service);
        res.json(service);
    } catch (error) {
        console.error('Error fetching service request:', error);
        res.status(500).json({ message: "Error fetching service request" });
    }
};

// Add this new function
export const getNearbyRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latitude, longitude } = req.query;
        const maxDistance = 50; // kilometers

        const requests = await serviceRepository.find({
            where: { status: "pending" },
            relations: ['user']
        });

        const nearbyRequests = requests
            .filter(request => request.coordinates)
            .map(request => {
                const distance = calculateDistance(
                    Number(latitude),
                    Number(longitude),
                    request.coordinates!.lat,
                    request.coordinates!.lng
                );
                return { ...request, distance };
            })
            .filter(request => request.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);

        res.json(nearbyRequests);
    } catch (error) {
        console.error('Error finding nearby requests:', error);
        res.status(500).json({ message: "Error finding nearby requests" });
    }
}; 