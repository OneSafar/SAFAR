import { Router, Request } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();

// Log a completed focus session
router.post('/', requireAuth, async (req: Request, res) => {
    try {
        const { durationMinutes, breakMinutes, completed } = req.body;
        const id = uuid();

        await db.execute({
            sql: `INSERT INTO focus_sessions (id, user_id, duration_minutes, break_minutes, completed, completed_at)
                  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [id, req.session.userId, durationMinutes, breakMinutes || 0, completed ? 1 : 0]
        });

        res.json({ success: true, id });
    } catch (error) {
        console.error('Log focus session error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get aggregated stats for current user
router.get('/stats', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId;

        // Total focus time (completed sessions only)
        const totalResult = await db.execute({
            sql: `SELECT 
                    COALESCE(SUM(duration_minutes), 0) as total_focus_minutes,
                    COALESCE(SUM(break_minutes), 0) as total_break_minutes,
                    COUNT(*) as total_sessions,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
                  FROM focus_sessions WHERE user_id = ?`,
            args: [userId]
        });
        const totals = totalResult.rows[0] as any;

        // Weekly data (last 7 days)
        const weeklyResult = await db.execute({
            sql: `SELECT 
                    strftime('%w', completed_at) as day_of_week,
                    COALESCE(SUM(duration_minutes), 0) as minutes
                  FROM focus_sessions 
                  WHERE user_id = ? 
                    AND completed_at >= datetime('now', '-7 days')
                    AND completed = 1
                  GROUP BY strftime('%w', completed_at)`,
            args: [userId]
        });

        // Convert to array indexed by day (0=Sun, 1=Mon, ..., 6=Sat)
        const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // M T W T F S S
        for (const row of weeklyResult.rows as any[]) {
            // Convert SQL day (0=Sun) to our format (0=Mon)
            const sqlDay = parseInt(row.day_of_week);
            const ourDay = sqlDay === 0 ? 6 : sqlDay - 1;
            weeklyData[ourDay] = row.minutes;
        }

        // Calculate focus streak (consecutive days with completed sessions)
        const streakResult = await db.execute({
            sql: `SELECT DISTINCT date(completed_at) as session_date 
                  FROM focus_sessions 
                  WHERE user_id = ? AND completed = 1
                  ORDER BY session_date DESC`,
            args: [userId]
        });

        let focusStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const row of streakResult.rows as any[]) {
            const sessionDate = new Date(row.session_date);
            sessionDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - focusStreak);

            if (sessionDate.getTime() === expectedDate.getTime()) {
                focusStreak++;
            } else if (focusStreak === 0 && sessionDate.getTime() === expectedDate.getTime() - 86400000) {
                // Allow yesterday if no session today yet
                focusStreak++;
            } else {
                break;
            }
        }

        // Goals stats
        const goalsResult = await db.execute({
            sql: `SELECT 
                    COUNT(*) as total_goals,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_goals
                  FROM goals WHERE user_id = ?`,
            args: [userId]
        });
        const goals = goalsResult.rows[0] as any;

        res.json({
            totalFocusMinutes: totals.total_focus_minutes || 0,
            totalBreakMinutes: totals.total_break_minutes || 0,
            totalSessions: totals.total_sessions || 0,
            completedSessions: totals.completed_sessions || 0,
            weeklyData,
            focusStreak,
            goalsSet: goals.total_goals || 0,
            goalsCompleted: goals.completed_goals || 0,
            dailyGoalMinutes: 240, // 4 hours default
            dailyGoalProgress: Math.min(100, Math.round(((totals.total_focus_minutes || 0) / 240) * 100))
        });
    } catch (error) {
        console.error('Get focus stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const focusSessionRoutes = router;
