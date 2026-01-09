import { Router, Request } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get streak data for current user
router.get('/', requireAuth, (req: Request, res) => {
    try {
        const streak = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(req.session.userId);

        if (!streak) {
            // Return default streak data if none exists
            return res.json({
                loginStreak: 0,
                checkInStreak: 0,
                goalCompletionStreak: 0,
                lastActiveDate: null
            });
        }

        res.json({
            loginStreak: streak.login_streak,
            checkInStreak: streak.check_in_streak,
            goalCompletionStreak: streak.goal_completion_streak,
            lastActiveDate: streak.last_active_date
        });
    } catch (error) {
        console.error('Get streaks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const streakRoutes = router;
