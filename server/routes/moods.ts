import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all moods for the current user
router.get('/', requireAuth, (req: Request, res) => {
    try {
        const moods = db.prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY timestamp DESC').all(req.session.userId);
        res.json(moods);
    } catch (error) {
        console.error('Get moods error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new mood entry
router.post('/', requireAuth, (req: Request, res) => {
    const { mood, intensity, notes } = req.body;

    if (!mood || !intensity) {
        return res.status(400).json({ message: 'Mood and intensity are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId;

        const insertMood = db.prepare(`
            INSERT INTO moods (id, user_id, mood, intensity, notes)
            VALUES (?, ?, ?, ?, ?)
        `);

        insertMood.run(id, userId, mood, intensity, notes || '');

        // Update verify streak (simple logic: increment check_in_streak)
        // In a real sophisticated app you'd check if they already checked in today
        const updateStreak = db.prepare(`
            UPDATE streaks 
            SET check_in_streak = check_in_streak + 1, last_active_date = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        updateStreak.run(userId);

        res.status(201).json({
            id,
            userId,
            mood,
            intensity,
            notes,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create mood error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const moodRoutes = router;
