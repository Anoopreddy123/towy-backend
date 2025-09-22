"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = void 0;
const events_1 = require("events");
class EventBus extends events_1.EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Increase max listeners for scalability
    }
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    emitEvent(event) {
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
    subscribe(eventType, handler) {
        console.log(`[EventBus] Subscribing to event: ${eventType}`);
        this.on(eventType, handler);
    }
    unsubscribe(eventType, handler) {
        console.log(`[EventBus] Unsubscribing from event: ${eventType}`);
        this.off(eventType, handler);
    }
    subscribeToAll(handler) {
        console.log(`[EventBus] Subscribing to all events`);
        this.on('event', handler);
    }
    getEventStats() {
        const eventTypes = this.eventNames().filter(name => name !== 'event');
        return {
            listeners: this.listenerCount('event'),
            eventTypes
        };
    }
}
exports.EventBus = EventBus;
// Export singleton instance
exports.eventBus = EventBus.getInstance();
