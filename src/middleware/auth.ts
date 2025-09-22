import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        // Normalize the user object to ensure req.user.id is available
        req.user = {
            ...decoded,
            id: decoded.userId || decoded.id
        };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};