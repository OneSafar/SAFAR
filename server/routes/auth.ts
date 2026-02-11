import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { checkPerks } from './perks';

const router = Router();
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_MIN_PASSWORD_LENGTH = 8;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, retryAfterSec: 0 };
    }

    bucket.count += 1;
    rateLimitStore.set(key, bucket);

    if (bucket.count > limit) {
        const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        return { limited: true, retryAfterSec };
    }

    return { limited: false, retryAfterSec: 0 };
}

function applyRateLimit(req: Request, res: any, keyPrefix: string, limit: number, windowMs: number) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${String(ip)}`;
    const { limited, retryAfterSec } = isRateLimited(key, limit, windowMs);

    if (limited) {
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({ message: 'Too many requests. Please try again later.' });
        return true;
    }

    return false;
}

function hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetLink(req: Request, token: string) {
    const baseUrl =
        process.env.PASSWORD_RESET_BASE_URL ||
        process.env.APP_BASE_URL ||
        `${req.protocol}://${req.get('host')}`;
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(email: string, resetLink: string) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const subject = 'Reset your SAFAR password';
    const text = `Reset your SAFAR password using this link: ${resetLink}\nThis link expires in 1 hour.`;

    if (!resendApiKey || !resendFrom) {
        console.warn('[PASSWORD RESET] Email provider not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
        console.log(`[PASSWORD RESET] To: ${email}`);
        console.log(`[PASSWORD RESET] Link: ${resetLink}`);
        return;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: resendFrom,
            to: [email],
            subject,
            text,
            html: `<p>Reset your SAFAR password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Resend error: ${response.status} ${errorBody}`);
    }
}

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, email, password, examType, preparationStage, gender, profileImage } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if user exists
        const existingResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Determine avatar: Use user-uploaded image if provided, otherwise use common default avatar
        let avatarUrl: string;

        if (profileImage && profileImage.startsWith('data:image')) {
            // User uploaded a custom profile image (base64 data URL)
            avatarUrl = profileImage;
        } else {
            // Common default avatar for all users (blue silhouette - Google style)
            avatarUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
        }

        await db.execute({
            sql: `INSERT INTO users (id, name, email, password_hash, avatar, exam_type, preparation_stage, gender)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [userId, name, email, hashedPassword, avatarUrl, examType || null, preparationStage || null, gender || null]
        });

        // Initialize streaks
        await db.execute({
            sql: `INSERT INTO streaks (id, user_id, login_streak, check_in_streak, goal_completion_streak, last_active_date)
                  VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
            args: [uuidv4(), userId]
        });

        // Set session
        req.session.userId = userId;

        res.status(201).json({
            id: userId,
            name,
            email,
            avatar: avatarUrl,
            examType,
            preparationStage,
            gender
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req: any, res) => {
    console.log('🔵 [LOGIN] Request received:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    try {
        console.log('🔵 [LOGIN] Pinging database...');
        await db.execute('SELECT 1');
        console.log('🟢 [LOGIN] Database ping successful');

        console.log('🔵 [LOGIN] Querying user (manual columns, excluding avatar)...');

        // Safety wrap for DB query to see if it actually returns
        const queryPromise = db.execute({
            sql: 'SELECT id, email, password_hash, name, exam_type, preparation_stage, gender FROM users WHERE email = ?',
            args: [email]
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DATABASE_QUERY_TIMEOUT')), 5000)
        );

        const result = await Promise.race([queryPromise, timeoutPromise]) as any;

        const user = result.rows[0] as any;
        console.log('🔵 [LOGIN] User found:', user ? 'Yes' : 'No');

        console.log('🔵 [LOGIN] Verifying password...');
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log('🔴 [LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('🟢 [LOGIN] Password verified');

        // Set session immediately
        req.session.userId = user.id;
        console.log('🟢 [LOGIN] Session userId set:', req.session.userId);

        // Update login streak (Best effort - don't block login if this fails)
        try {
            console.log('🔵 [LOGIN] Updating streaks...');
            await updateLoginStreak(user.id);
            console.log('🟢 [LOGIN] Streaks updated');

            // Check and award perks based on current stats
            try {
                await checkPerks(user.id, 'login');
                console.log('🟢 [LOGIN] Perks checked');
            } catch (perkError) {
                console.error('🟠 [LOGIN] Perk check failed (non-fatal):', perkError);
            }
        } catch (streakError) {
            console.error('🟠 [LOGIN] Streak update failed (non-fatal):', streakError);
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png', // Placeholder for test
            examType: user.exam_type,
            preparationStage: user.preparation_stage,
            gender: user.gender
        });
        console.log('🟢 [LOGIN] Response sent');
    } catch (error: any) {
        console.error('🔴 [LOGIN ERROR]:', error.message || error);
        if (error.message === 'DATABASE_QUERY_TIMEOUT') {
            return res.status(504).json({ message: 'Database query timed out' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper for streak updates
async function updateLoginStreak(userId: string) {
    const streakResult = await db.execute({
        sql: 'SELECT * FROM streaks WHERE user_id = ?',
        args: [userId]
    });
    const currentStreak = streakResult.rows[0] as any;

    // Get current date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
    const nowIST = new Date(now.getTime() + istOffset);
    const todayIST = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD

    if (currentStreak && currentStreak.last_active_date) {
        const lastActiveDate = new Date(currentStreak.last_active_date);
        const lastActiveIST = new Date(lastActiveDate.getTime() + istOffset);
        const lastDateIST = lastActiveIST.toISOString().split('T')[0];

        // First login ever (streak is 0 from signup), set to 1
        if (currentStreak.login_streak === 0) {
            await db.execute({
                sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                args: [now.toISOString(), userId]
            });
        } else if (lastDateIST === todayIST) {
            // Already logged in today, don't increment streak
        } else {
            // Check if yesterday (to maintain streak) or gap (reset streak)
            const yesterday = new Date(nowIST);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayIST = yesterday.toISOString().split('T')[0];

            if (lastDateIST === yesterdayIST) {
                // Consecutive day, increment streak
                await db.execute({
                    sql: `UPDATE streaks SET login_streak = login_streak + 1, last_active_date = ? WHERE user_id = ?`,
                    args: [now.toISOString(), userId]
                });
            } else {
                // Missed days, reset streak to 1
                await db.execute({
                    sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                    args: [now.toISOString(), userId]
                });
            }
        }
    } else {
        // First login ever (or missing streak record), set streak to 1
        await db.execute({
            sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
            args: [now.toISOString(), userId]
        });
    }
}

// Logout
router.post('/logout', (req: Request, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('nistha.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Request password reset link
router.post('/forgot-password', async (req: Request, res) => {
    if (applyRateLimit(req, res, 'forgot-password', 5, 15 * 60 * 1000)) return;

    const email = String(req.body?.email || '').trim().toLowerCase();
    const genericMessage = 'If an account exists for that email, a reset link has been sent.';

    if (!email || !email.includes('@')) {
        return res.json({ message: genericMessage });
    }

    try {
        const userResult = await db.execute({
            sql: 'SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
            args: [email]
        });
        const user = userResult.rows[0] as any;

        if (user) {
            const rawToken = randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(rawToken);
            const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();

            // Keep token table clean and invalidate any previous active tokens for this user.
            await db.execute({
                sql: 'DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < NOW() OR used_at IS NOT NULL',
                args: [user.id]
            });

            await db.execute({
                sql: `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
                      VALUES (?, ?, ?, ?)`,
                args: [uuidv4(), user.id, tokenHash, expiresAt]
            });

            const resetLink = buildPasswordResetLink(req, rawToken);
            try {
                await sendPasswordResetEmail(String(user.email || email), resetLink);
            } catch (sendError) {
                console.error('Password reset email send failed:', sendError);
            }
        }

        return res.json({ message: genericMessage });
    } catch (error) {
        console.error('Forgot password error:', error);
        // Do not expose account existence or internal state.
        return res.json({ message: genericMessage });
    }
});

// Confirm password reset using one-time token
router.post('/reset-password/confirm', async (req: Request, res) => {
    if (applyRateLimit(req, res, 'reset-password-confirm', 10, 15 * 60 * 1000)) return;

    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < PASSWORD_RESET_MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
            message: `Password must be at least ${PASSWORD_RESET_MIN_PASSWORD_LENGTH} characters`
        });
    }

    try {
        const tokenHash = hashResetToken(token);
        const tokenResult = await db.execute({
            sql: `SELECT id, user_id
                  FROM password_reset_tokens
                  WHERE token_hash = ?
                    AND used_at IS NULL
                    AND expires_at > NOW()
                  LIMIT 1`,
            args: [tokenHash]
        });
        const tokenRow = tokenResult.rows[0] as any;

        if (!tokenRow) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute({
            sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
            args: [hashedPassword, tokenRow.user_id]
        });

        await db.execute({
            sql: 'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
            args: [tokenRow.id]
        });

        // Invalidate any remaining active tokens for the same user.
        await db.execute({
            sql: 'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
            args: [tokenRow.user_id]
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password confirm error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Deprecated insecure endpoints (kept temporarily for compatibility)
router.post('/check-email', async (_req: Request, res) => {
    res.status(410).json({ message: 'Deprecated endpoint. Use /api/auth/forgot-password.' });
});

router.post('/reset-password', async (_req: Request, res) => {
    res.status(410).json({ message: 'Deprecated endpoint. Use /api/auth/reset-password/confirm.' });
});

// Get Current User
router.get('/me', requireAuth, async (req: Request, res) => {
    console.log('🔵 [ME] Request received, session userId:', req.session.userId);
    try {
        // Query user without avatar to avoid timeout with large base64 images
        const userResult = await db.execute({
            sql: 'SELECT id, email, name, exam_type, preparation_stage, gender, created_at FROM users WHERE id = ?',
            args: [req.session.userId]
        });
        const user = userResult.rows[0] as any;
        console.log('🔵 [ME] User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch avatar separately with fallback
        let avatarUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
        try {
            const avatarResult = await db.execute({
                sql: 'SELECT avatar FROM users WHERE id = ?',
                args: [user.id]
            });
            if (avatarResult.rows.length > 0) {
                const avatarRow = avatarResult.rows[0] as any;
                avatarUrl = avatarRow.avatar || avatarUrl;
            }
        } catch (avatarError) {
            console.warn('⚠️ [ME] Avatar fetch failed, using default');
        }

        // Get streaks
        const streaksResult = await db.execute({
            sql: 'SELECT * FROM streaks WHERE user_id = ?',
            args: [user.id]
        });
        const streaks = streaksResult.rows[0] as any;

        // Log daily activity in login_history (once per day)
        try {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0];

            const historyCheck = await db.execute({
                sql: "SELECT timestamp FROM login_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1",
                args: [user.id]
            });

            let shouldInsert = true;
            if (historyCheck.rows.length > 0) {
                const lastTimestamp = historyCheck.rows[0].timestamp as any;
                let lastDate: Date;

                if (lastTimestamp instanceof Date) {
                    lastDate = lastTimestamp;
                } else {
                    const timestampStr = lastTimestamp as string;
                    lastDate = new Date(timestampStr + (timestampStr.includes('Z') ? '' : 'Z'));
                }

                const lastDateIST = new Date(lastDate.getTime() + istOffset).toISOString().split('T')[0];

                if (lastDateIST === todayIST) {
                    shouldInsert = false;
                }
            }

            if (shouldInsert) {
                await db.execute({
                    sql: "INSERT INTO login_history (id, user_id) VALUES (?, ?)",
                    args: [uuidv4(), user.id]
                });
                console.log('🟢 [ME] Logged daily activity for:', todayIST);
            }
        } catch (logError) {
            console.error('Failed to log daily activity:', logError);
            // Don't block the actual response
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: avatarUrl,
                examType: user.exam_type,
                preparationStage: user.preparation_stage,
                gender: user.gender
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

// Get Login History
router.get('/login-history', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT timestamp FROM login_history WHERE user_id = ? ORDER BY timestamp DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Profile
router.patch('/profile', requireAuth, async (req: Request, res) => {
    const { name, examType, preparationStage, gender, avatar } = req.body;
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
        if (gender !== undefined) {
            updates.push('gender = ?');
            values.push(gender);
        }
        if (avatar !== undefined) {
            updates.push('avatar = ?');
            values.push(avatar);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(userId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        console.log('📝 [PROFILE UPDATE] SQL:', sql, 'Values:', values);
        await db.execute({ sql, args: values });

        // Return updated user
        const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [userId]
        });
        const user = userResult.rows[0] as any;

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            examType: user.exam_type,
            preparationStage: user.preparation_stage,
            gender: user.gender
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const authRoutes = router;
