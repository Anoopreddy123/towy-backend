import { eventBus, ServiceRequestEvent } from './EventBus';
import { emailService, ServiceRequestDetails, ProviderDetails } from '../services/emailService';
import { GeoService } from '../config/geo-services';

export class NotificationEventHandler {
    private geoService: GeoService;
    private static instance: NotificationEventHandler;

    private constructor() {
        this.geoService = new GeoService();
        this.setupEventListeners();
    }

    public static getInstance(): NotificationEventHandler {
        if (!NotificationEventHandler.instance) {
            NotificationEventHandler.instance = new NotificationEventHandler();
        }
        return NotificationEventHandler.instance;
    }

    private setupEventListeners(): void {
        // Listen for new service request events
        eventBus.subscribe('service_request_created', (event: any) => {
            if (event.type === 'service_request_created') {
                this.handleServiceRequestCreated(event as ServiceRequestEvent);
            }
        });
        
        console.log('[NotificationEventHandler] Event listeners set up successfully');
    }

    private async handleServiceRequestCreated(event: ServiceRequestEvent): Promise<void> {
        try {
            console.log('[NotificationEventHandler] Processing new service request:', event.data.requestId);
            console.log('[NotificationEventHandler] Full event data:', JSON.stringify(event.data, null, 2));
            
            const { requestId, serviceType, location, coordinates } = event.data;
            console.log('[NotificationEventHandler] Extracted data:', { requestId, serviceType, location, coordinates });
            
            // Find nearby providers
            const nearbyProviders = await this.findNearbyProviders(coordinates, serviceType);
            
            if (nearbyProviders.length === 0) {
                console.log('[NotificationEventHandler] No nearby providers found for request:', requestId);
                return;
            }

            console.log(`[NotificationEventHandler] Found ${nearbyProviders.length} nearby providers for request:`, requestId);

            // Prepare service request details for email
            const serviceRequestDetails: ServiceRequestDetails = {
                id: requestId,
                type: serviceType,
                location: location,
                coordinates: coordinates,
                vehicleType: event.data.vehicleType || 'Unknown',
                description: event.data.description,
                createdAt: event.timestamp
            };

            // Send email notifications to all nearby providers
            const result = await emailService.sendBulkServiceRequestNotifications(
                nearbyProviders,
                serviceRequestDetails
            );

            console.log(`[NotificationEventHandler] Email notifications sent for request ${requestId}:`, result);

            // Emit notification events for tracking
            eventBus.emitEvent({
                id: `notification_batch_${requestId}_${Date.now()}`,
                type: 'notification_send',
                timestamp: new Date(),
                data: {
                    userId: event.data.userId,
                    message: `Service request notifications sent to ${result.sent} providers`,
                    channel: 'email',
                    metadata: {
                        requestId,
                        providersNotified: result.sent,
                        providersFailed: result.failed,
                        totalProviders: nearbyProviders.length
                    }
                }
            });

        } catch (error) {
            console.error('[NotificationEventHandler] Error handling service request created event:', error);
            
            // Emit failure event
            eventBus.emitEvent({
                id: `notification_error_${event.data.requestId}_${Date.now()}`,
                type: 'notification_failed',
                timestamp: new Date(),
                data: {
                    userId: event.data.userId,
                    message: 'Failed to send service request notifications',
                    channel: 'email',
                    metadata: {
                        requestId: event.data.requestId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                }
            });
        }
    }

    private async findNearbyProviders(
        coordinates: { lat: number; lng: number } | undefined,
        serviceType: string
    ): Promise<ProviderDetails[]> {
        try {
            if (!coordinates) {
                console.warn('[NotificationEventHandler] No coordinates provided for finding nearby providers');
                return [];
            }

            // Find providers within 50km radius (adjust as needed)
            const radiusKm = 50;
            const nearbyProviders = await this.geoService.findNearbyProviders(
                coordinates.lat,
                coordinates.lng,
                radiusKm,
                serviceType
            );

            // Filter providers by service type and availability
            const availableProviders = nearbyProviders.filter(provider => {
                // Check if provider offers this service type
                const offersService = provider.services?.includes(serviceType) || 
                                   provider.services?.includes('all') ||
                                   provider.services?.includes('general');
                
                // Check if provider is available
                const isAvailable = provider.isAvailable !== false;
                
                return offersService && isAvailable;
            });

            // Convert to ProviderDetails format
            const providerDetails: ProviderDetails[] = availableProviders.map(provider => ({
                id: provider.id,
                email: provider.email,
                businessName: provider.businessName,
                name: provider.name || provider.businessName || 'Provider'
            }));

            console.log(`[NotificationEventHandler] Found ${providerDetails.length} available providers for ${serviceType} service`);
            return providerDetails;

        } catch (error) {
            console.error('[NotificationEventHandler] Error finding nearby providers:', error);
            return [];
        }
    }

    public async testNotificationSystem(): Promise<boolean> {
        try {
            // Test email connection
            const emailConnectionOk = await emailService.testEmailConnection();
            if (!emailConnectionOk) {
                console.error('[NotificationEventHandler] Email service connection failed');
                return false;
            }

            // Test geo service
            const testProviders = await this.geoService.findNearbyProviders(0, 0, 1, 'towing');
            console.log('[NotificationEventHandler] Geo service test successful');

            console.log('[NotificationEventHandler] Notification system test completed successfully');
            return true;
        } catch (error) {
            console.error('[NotificationEventHandler] Notification system test failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const notificationEventHandler = NotificationEventHandler.getInstance();
