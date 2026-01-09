import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// Extend session type
declare module 'express-session' {
    interface SessionData {
        userId: string;
    }
}
