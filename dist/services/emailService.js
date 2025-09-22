"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create transporter for sending emails - hardcoded configuration
const createTransporter = () => {
    // Hardcoded email credentials for testing
    const emailConfig = {
        service: 'gmail',
        auth: {
            user: 'servicetowy@gmail.com',
            pass: 'ffhu voec tuci zyte'
        }
    };
    console.log('[EmailService] Using hardcoded email configuration');
    return nodemailer_1.default.createTransport(emailConfig);
};
const transporter = createTransporter();
class EmailService {
    constructor() { }
    static getInstance() {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }
    async sendServiceRequestNotification(provider, serviceRequest) {
        try {
            if (!transporter) {
                console.warn(`[EmailService] Cannot send notification to ${provider.email} - no email transporter configured`);
                return false;
            }
            const mailOptions = {
                from: 'servicetowy@gmail.com',
                to: provider.email,
                subject: `New ${serviceRequest.type} Request Available - Towy`,
                html: this.generateServiceRequestEmailHTML(provider, serviceRequest),
                text: this.generateServiceRequestEmailText(provider, serviceRequest)
            };
            const result = await transporter.sendMail(mailOptions);
            console.log(`[EmailService] Notification sent to ${provider.email} for request ${serviceRequest.id}`);
            return true;
        }
        catch (error) {
            console.error(`[EmailService] Failed to send notification to ${provider.email}:`, error);
            return false;
        }
    }
    async sendBulkServiceRequestNotifications(providers, serviceRequest) {
        let sent = 0;
        let failed = 0;
        // Send emails in parallel with a small delay to avoid rate limiting
        const promises = providers.map(async (provider, index) => {
            // Add small delay between emails to avoid rate limiting
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 100 * index));
            }
            const success = await this.sendServiceRequestNotification(provider, serviceRequest);
            if (success) {
                sent++;
            }
            else {
                failed++;
            }
        });
        await Promise.all(promises);
        console.log(`[EmailService] Bulk notification complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }
    generateServiceRequestEmailHTML(provider, serviceRequest) {
        const businessName = provider.businessName || provider.name;
        const serviceTypeFormatted = serviceRequest.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>New Service Request - Towy</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .service-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                    .cta-button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚗 New Service Request Available</h1>
                        <p>Hi ${businessName}, a new service request is available in your area!</p>
                    </div>
                    
                    <div class="content">
                        <div class="service-details">
                            <h2>Service Request Details</h2>
                            <ul>
                                <li><strong>Service Type:</strong> ${serviceTypeFormatted}</li>
                                <li><strong>Location:</strong> ${serviceRequest.location}</li>
                                <li><strong>Vehicle Type:</strong> ${serviceRequest.vehicleType}</li>
                                <li><strong>Request Time:</strong> ${serviceRequest.createdAt.toLocaleString()}</li>
                                ${serviceRequest.description ? `<li><strong>Description:</strong> ${serviceRequest.description}</li>` : ''}
                            </ul>
                        </div>
                        
                        <p>This request is in your service area and matches your capabilities. Don't miss this opportunity!</p>
                        
                        <a href="http://localhost:3000/provider/dashboard" class="cta-button">
                            View Request & Accept
                        </a>
                        
                        <p><small>Request ID: ${serviceRequest.id}</small></p>
                    </div>
                    
                    <div class="footer">
                        <p>This notification was sent by Towy - Your trusted roadside assistance platform</p>
                        <p>If you no longer wish to receive these notifications, please update your preferences in your dashboard.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    generateServiceRequestEmailText(provider, serviceRequest) {
        const businessName = provider.businessName || provider.name;
        const serviceTypeFormatted = serviceRequest.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
New Service Request Available - Towy

Hi ${businessName},

A new service request is available in your area:

Service Type: ${serviceTypeFormatted}
Location: ${serviceRequest.location}
Vehicle Type: ${serviceRequest.vehicleType}
Request Time: ${serviceRequest.createdAt.toLocaleString()}
${serviceRequest.description ? `Description: ${serviceRequest.description}` : ''}

This request is in your service area and matches your capabilities. Don't miss this opportunity!

View Request & Accept: http://localhost:3000/provider/dashboard

Request ID: ${serviceRequest.id}

---
This notification was sent by Towy - Your trusted roadside assistance platform
If you no longer wish to receive these notifications, please update your preferences in your dashboard.
        `;
    }
    async testEmailConnection() {
        try {
            if (!transporter) {
                console.warn('[EmailService] No email transporter configured - skipping connection test');
                return false;
            }
            await transporter.verify();
            console.log('[EmailService] Email connection verified successfully');
            return true;
        }
        catch (error) {
            console.error('[EmailService] Email connection failed:', error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
// Export singleton instance
exports.emailService = EmailService.getInstance();
