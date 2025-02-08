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
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Service request routes
router.get('/public/providers', getAvailableProviders);
router.post('/request', authMiddleware, createServiceRequest);
router.get('/providers', authMiddleware, getAvailableProviders);
router.get('/user-requests', authMiddleware, getUserRequests);
router.patch('/request/:id/status', authMiddleware, updateServiceStatus);
router.post('/request/:serviceId/quote', authMiddleware, submitQuote);
router.get('/request/:serviceId/quotes', authMiddleware, getServiceQuotes);
router.post('/request/:serviceId/accept-quote', authMiddleware, acceptQuote);
router.get('/provider/services', authMiddleware, getProviderServices);
router.get('/nearby-providers', authMiddleware, findNearbyProviders);
router.post('/notify-provider', authMiddleware, notifyProvider);
router.get('/request/:id', authMiddleware, getServiceRequest);
router.get('/nearby-requests', authMiddleware, getNearbyRequests);

export const serviceRouter = router; 