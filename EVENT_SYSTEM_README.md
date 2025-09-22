# Event-Driven Architecture for Towy

## Overview

The Towy backend now implements an event-driven architecture for real-time provider notifications. When a customer creates a service request, nearby providers automatically receive email notifications.

## Architecture Components

### 1. EventBus (`src/events/EventBus.ts`)
- **Publisher-Subscriber Pattern**: Handles event emission and subscription
- **Event Types**: Service requests, provider events, notifications
- **Singleton Pattern**: Ensures single instance across the application

### 2. Email Service (`src/services/emailService.ts`)
- **Provider Notifications**: Sends HTML and text emails to providers
- **Bulk Notifications**: Handles multiple providers with rate limiting
- **Template System**: Professional email templates with service details

### 3. Notification Event Handler (`src/events/NotificationEventHandler.ts`)
- **Event Listener**: Subscribes to `service_request_created` events
- **Provider Discovery**: Finds nearby providers using GeoService
- **Email Dispatch**: Sends notifications to all eligible providers

### 4. Service Controller Integration (`src/controllers/serviceController.ts`)
- **Event Emission**: Publishes events when service requests are created
- **Event Data**: Includes all necessary information for notifications

## Event Flow

```
1. Customer creates service request
   ↓
2. ServiceController.createServiceRequest()
   ↓
3. EventBus.emitEvent('service_request_created')
   ↓
4. NotificationEventHandler.handleServiceRequestCreated()
   ↓
5. GeoService.findNearbyProviders()
   ↓
6. EmailService.sendBulkServiceRequestNotifications()
   ↓
7. Providers receive email notifications
```

## Environment Variables Required

```bash
# Email Configuration (REQUIRED for event system)
EMAIL_USER=servicetowy@gmail.com
EMAIL_PASSWORD=Anoop@123

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

**Note**: Database configuration (`DATABASE_URL`, `GEOSPATIAL_DB_URL`) is already set up for your existing application and doesn't need to be changed for the event system.

## Testing the Event System

### 1. Test Endpoint
```bash
GET /test-events
```
Returns event system status and test results.

### 2. Create Service Request
```bash
POST /services/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceType": "towing",
  "location": "123 Main St, City, State",
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "vehicleType": "Sedan",
  "description": "Car won't start"
}
```

### 3. Check Logs
The system logs all event processing:
- Event emission
- Provider discovery
- Email sending results
- Error handling

## Email Templates

The system sends professional HTML emails with:
- Service request details
- Location information
- Direct link to provider dashboard
- Request ID for tracking

## Error Handling

- **Email Failures**: Logged but don't block service request creation
- **Provider Discovery**: Graceful fallback if no providers found
- **Event System**: Continues operation even if individual events fail

## Scalability Considerations

- **Rate Limiting**: Small delays between bulk emails
- **Event Bus**: Configurable max listeners (currently 50)
- **Async Processing**: Non-blocking event handling
- **Error Isolation**: Individual failures don't affect the system

## Future Enhancements

1. **SMS Notifications**: Add SMS channel support
2. **Push Notifications**: Mobile app integration
3. **Provider Preferences**: Allow providers to set notification preferences
4. **Event Persistence**: Store events for analytics
5. **Webhook Support**: External system integration

## Monitoring

Monitor the event system through:
- `/test-events` endpoint
- Application logs
- Email delivery reports
- Event bus statistics
