import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, email, password, examType, preparationStage } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

        const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, avatar, exam_type, preparation_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        insertUser.run(userId, name, email, hashedPassword, avatar, examType, preparationStage);

        // Initialize streaks
        const insertStreak = db.prepare(`
        INSERT INTO streaks (id, user_id, login_streak, check_in_streak, goal_completion_streak, last_active_date)
        VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
    `);
        insertStreak.run(uuidv4(), userId);

        // Set session
        req.session.userId = userId;

        res.status(201).json({
            id: userId,
            name,
            email,
            avatar,
            examType,
            preparationStage
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req: Request, res) => {
    console.log('🔵 [LOGIN] Request received:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        console.log('🔵 [LOGIN] User found:', user ? 'Yes' : 'No');

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log('🔴 [LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update login streak logic (simplified for now)
        // In a real app, calculate streak based on last_active_date
        const updateStreak = db.prepare(`
        UPDATE streaks 
        SET login_streak = login_streak + 1, last_active_date = CURRENT_TIMESTAMP 
        WHERE user_id = ?
    `);
        updateStreak.run(user.id);
        console.log('🟢 [LOGIN] Streak updated');

        req.session.userId = user.id;
        console.log('🟢 [LOGIN] Session userId set:', req.session.userId);
        console.log('🟢 [LOGIN] Session ID:', req.sessionID);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            examType: user.exam_type,
            preparationStage: user.preparation_stage
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req: Request, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('nistha.sid'); // Matching cookie name from index.ts
        res.json({ message: 'Logged out successfully' });
    });
});

// Get Current User
router.get('/me', requireAuth, (req: Request, res) => {
    console.log('🔵 [ME] Request received, session userId:', req.session.userId);
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) as any;
        console.log('🔵 [ME] User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get streaks
        const streaks = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(user.id) as any;

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                examType: user.exam_type,
                preparationStage: user.preparation_stage
            },
            streaks: {
                loginStreak: streaks?.login_streak || 0,
                checkInStreak: streaks?.check_in_streak || 0,
                goalCompletionStreak: streaks?.goal_completion_streak || 0,
                lastActiveDate: streaks?.last_active_date
            }
        });
        console.log('🟢 [ME] Sending response with user and streaks');

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Profile
router.patch('/profile', requireAuth, (req: Request, res) => {
    const { name, examType, preparationStage } = req.body;
    const userId = req.session.userId;

    try {
        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (examType !== undefined) {
            updates.push('exam_type = ?');
            values.push(examType);
        }
        if (preparationStage !== undefined) {
            updates.push('preparation_stage = ?');
            values.push(preparationStage);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(userId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...values);

        // Return updated user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            examType: user.exam_type,
            preparationStage: user.preparation_stage
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const authRoutes = router;
