import { EventEmitter } from 'events';

export interface BaseEvent {
    id: string;
    type: string;
    timestamp: Date;
    data: any;
}

export interface ServiceRequestEvent extends BaseEvent {
    type: 'service_request_created' | 'service_request_accepted' | 'service_request_completed' | 'service_request_cancelled';
    data: {
        requestId: string;
        userId: string;
        providerId?: string;
        serviceType: string;
        location: string;
        coordinates?: { lat: number; lng: number };
        description?: string;
        vehicleType?: string;
    };
}

export interface ProviderEvent extends BaseEvent {
    type: 'provider_available' | 'provider_unavailable' | 'provider_location_updated';
    data: {
        providerId: string;
        location?: { lat: number; lng: number };
        services?: string[];
    };
}

export interface NotificationEvent extends BaseEvent {
    type: 'notification_send' | 'notification_delivered' | 'notification_failed';
    data: {
        userId: string;
        message: string;
        channel: 'email' | 'sms' | 'push';
        metadata?: any;
    };
}

export type TowyEvent = ServiceRequestEvent | ProviderEvent | NotificationEvent;

export class EventBus extends EventEmitter {
    private static instance: EventBus;

    private constructor() {
        super();
        this.setMaxListeners(50); // Increase max listeners for scalability
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public emitEvent(event: TowyEvent): void {
        console.log(`[EventBus] Emitting event: ${event.type}`, {
            id: event.id,
            timestamp: event.timestamp,
            data: event.data
        });
        
        // Emit the specific event type
        this.emit(event.type, event);
        
        // Also emit a generic 'event' for global listeners
        this.emit('event', event);
    }

    public subscribe(eventType: string, handler: (event: TowyEvent) => void): void {
        console.log(`[EventBus] Subscribing to event: ${eventType}`);
        this.on(eventType, handler);
    }

    public unsubscribe(eventType: string, handler: (event: TowyEvent) => void): void {
        console.log(`[EventBus] Unsubscribing from event: ${eventType}`);
        this.off(eventType, handler);
    }

    public subscribeToAll(handler: (event: TowyEvent) => void): void {
        console.log(`[EventBus] Subscribing to all events`);
        this.on('event', handler);
    }

    public getEventStats(): { listeners: number; eventTypes: string[] } {
        const eventTypes = this.eventNames().filter(name => name !== 'event') as string[];
        return {
            listeners: this.listenerCount('event'),
            eventTypes
        };
    }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

