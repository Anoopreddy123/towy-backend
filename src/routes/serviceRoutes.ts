import { Router } from 'express';
import { 
    createServiceRequest,
    getAvailableProviders,
    getUserRequests,
    updateServiceStatus,
    submitQuote,
    getServiceQuotes,
    acceptQuote,
    getProviderServices,
    findNearbyProviders,
    notifyProvider,
    getServiceRequest,
    getNearbyRequests
} from '../controllers/serviceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Service request routes
router.get('/public/providers', getAvailableProviders);
router.post('/request', authenticateToken, createServiceRequest);
router.get('/providers', authenticateToken, getAvailableProviders);
router.get('/user-requests', authenticateToken, getUserRequests);
router.patch('/request/:id/status', authenticateToken, updateServiceStatus);
router.post('/request/:serviceId/quote', authenticateToken, submitQuote);
router.get('/request/:serviceId/quotes', authenticateToken, getServiceQuotes);
router.post('/request/:serviceId/accept-quote', authenticateToken, acceptQuote);
router.get('/provider/services', authenticateToken, getProviderServices);
router.get('/nearby-providers', authenticateToken, findNearbyProviders);
router.post('/notify-provider', authenticateToken, notifyProvider);
router.get('/request/:id', authenticateToken, getServiceRequest);
router.get('/nearby-requests', authenticateToken, getNearbyRequests);

export const serviceRouter = router; 