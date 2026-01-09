import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all journal entries
router.get('/', requireAuth, (req: Request, res) => {
    try {
        const entries = db.prepare('SELECT * FROM journal WHERE user_id = ? ORDER BY timestamp DESC').all(req.session.userId);
        res.json(entries);
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create entry
router.post('/', requireAuth, (req: Request, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId;

        const insertEntry = db.prepare(`
            INSERT INTO journal (id, user_id, content)
            VALUES (?, ?, ?)
        `);

        insertEntry.run(id, userId, content);

        res.status(201).json({
            id,
            userId,
            content,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete entry
router.delete('/:id', requireAuth, (req: Request, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        const result = db.prepare('DELETE FROM journal WHERE id = ? AND user_id = ?').run(id, userId);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Entry not found or unauthorized' });
        }

        res.json({ message: 'Entry deleted' });
    } catch (error) {
        console.error('Delete journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const journalRoutes = router;
