"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
// User management routes (admin only)
router.get('/', auth_1.authMiddleware, (0, checkRole_1.checkRole)(['admin']), userController_1.getAllUsers);
router.get('/:id', auth_1.authMiddleware, (0, checkRole_1.checkRole)(['admin']), userController_1.getUserById);
router.put('/:id', auth_1.authMiddleware, (0, checkRole_1.checkRole)(['admin']), userController_1.updateUser);
router.delete('/:id', auth_1.authMiddleware, (0, checkRole_1.checkRole)(['admin']), userController_1.deleteUser);
exports.userRouter = router;
