"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.authRouter = router;
// Add error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
router.post('/signup', asyncHandler(authController_1.signup));
router.post('/login', asyncHandler(authController_1.login));
router.post('/provider/login', authController_1.loginProvider);
router.get('/me', auth_1.authMiddleware, asyncHandler(authController_1.getCurrentUser));
router.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});
