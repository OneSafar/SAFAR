import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ========================================
// PERK DEFINITIONS (Seed Data)
// ========================================

const PERK_DEFINITIONS = [
    // AURA TITLES (Dynamic - can be lost)
    { id: 'A001', name: 'The Resilient', type: 'aura', category: 'streak', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 7 }), display_priority: 80 },
    { id: 'A002', name: 'The Unwavering', type: 'aura', category: 'streak', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 30 }), display_priority: 100 },
    { id: 'A005', name: 'The Balanced', type: 'aura', category: 'mood', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 7 }), display_priority: 80 },
    { id: 'A006', name: 'Goal Guardian', type: 'aura', category: 'goals', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'goal_completion_streak', operator: '>=', value: 7 }), display_priority: 80 },
    { id: 'A007', name: 'The Steadfast', type: 'aura', category: 'streak', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'all_streaks', operator: '>=', value: 7 }), display_priority: 100 },
    { id: 'A008', name: 'Deep Work Monk', type: 'aura', category: 'focus', rarity: null, tier: null, criteria_json: JSON.stringify({ field: 'focus_sessions_7d', operator: '>=', value: 5 }), display_priority: 70 },

    // ECHO BADGES - Focus Time Progression
    { id: 'E001', name: 'Focus Initiate', type: 'echo', category: 'focus', rarity: 'common', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'E002', name: 'Focus Adept', type: 'echo', category: 'focus', rarity: 'uncommon', tier: 2, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 50 }), display_priority: 20 },
    { id: 'E003', name: 'Deep Work Disciple', type: 'echo', category: 'focus', rarity: 'rare', tier: 3, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 100 }), display_priority: 30 },
    { id: 'E004', name: 'Concentration Master', type: 'echo', category: 'focus', rarity: 'epic', tier: 4, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 250 }), display_priority: 40 },
    { id: 'E005', name: 'Flow State Master', type: 'echo', category: 'focus', rarity: 'legendary', tier: 5, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 500 }), display_priority: 50 },

    // ECHO BADGES - Goals Progression
    { id: 'E006', name: 'Goal Starter', type: 'echo', category: 'goals', rarity: 'common', tier: 1, criteria_json: JSON.stringify({ field: 'sincere_goals_completed', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'E007', name: 'Goal Achiever', type: 'echo', category: 'goals', rarity: 'uncommon', tier: 2, criteria_json: JSON.stringify({ field: 'sincere_goals_completed', operator: '>=', value: 100 }), display_priority: 20 },
    { id: 'E008', name: 'Goal Crusher', type: 'echo', category: 'goals', rarity: 'rare', tier: 3, criteria_json: JSON.stringify({ field: 'sincere_goals_completed', operator: '>=', value: 1000 }), display_priority: 30 },
    { id: 'E009', name: 'Vision Architect', type: 'echo', category: 'goals', rarity: 'epic', tier: 4, criteria_json: JSON.stringify({ field: 'sincere_goals_completed', operator: '>=', value: 5000 }), display_priority: 40 },
    { id: 'E010', name: 'Dream Weaver', type: 'echo', category: 'goals', rarity: 'legendary', tier: 5, criteria_json: JSON.stringify({ field: 'sincere_goals_completed', operator: '>=', value: 10000 }), display_priority: 50 },

    // ECHO BADGES - Emotional Intelligence
    { id: 'E011', name: 'Self-Aware Seeker', type: 'echo', category: 'mood', rarity: 'common', tier: 1, criteria_json: JSON.stringify({ field: 'total_mood_checkins', operator: '>=', value: 30 }), display_priority: 10 },
    { id: 'E012', name: 'Emotional Navigator', type: 'echo', category: 'mood', rarity: 'uncommon', tier: 2, criteria_json: JSON.stringify({ field: 'total_mood_checkins', operator: '>=', value: 100 }), display_priority: 20 },
    { id: 'E013', name: 'Mindful Observer', type: 'echo', category: 'mood', rarity: 'rare', tier: 3, criteria_json: JSON.stringify({ field: 'total_mood_checkins', operator: '>=', value: 365 }), display_priority: 30 },
    { id: 'E014', name: 'Inner Voice Listener', type: 'echo', category: 'mood', rarity: 'rare', tier: 3, criteria_json: JSON.stringify({ field: 'sincere_journal_entries', operator: '>=', value: 50 }), display_priority: 30 },
    { id: 'E015', name: 'Reflection Master', type: 'echo', category: 'mood', rarity: 'epic', tier: 4, criteria_json: JSON.stringify({ field: 'sincere_journal_entries', operator: '>=', value: 200 }), display_priority: 40 },

    // SEASONAL PERKS (Examples)
    { id: 'S003', name: 'Foundation Builder', type: 'seasonal', category: 'special', rarity: 'legendary', tier: null, criteria_json: JSON.stringify({ field: 'joined_before', value: '2026-02-01' }), display_priority: 100, is_limited: 1 },
];

// ========================================
// SINCERITY SCORING HELPERS
// ========================================

// Goals are "sincere" if completed >= 5 minutes after creation
async function getSincereGoalsCount(userId: string): Promise<number> {
    const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM goals 
              WHERE user_id = ? AND completed = 1 
              AND (julianday(completed_at) - julianday(created_at)) * 24 * 60 >= 5`,
        args: [userId]
    });
    return (result.rows[0] as any).count || 0;
}

// Journal entries are "sincere" if length >= 20 characters
async function getSincereJournalCount(userId: string): Promise<number> {
    const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM journal 
              WHERE user_id = ? AND LENGTH(content) >= 20`,
        args: [userId]
    });
    return (result.rows[0] as any).count || 0;
}

// ========================================
// DATA FETCHING FOR PERK CHECKS
// ========================================

async function getUserStats(userId: string) {
    // Streaks
    const streaksResult = await db.execute({
        sql: 'SELECT * FROM streaks WHERE user_id = ?',
        args: [userId]
    });
    const streaks = streaksResult.rows[0] as any || { login_streak: 0, check_in_streak: 0, goal_completion_streak: 0 };

    // Total focus hours (completed sessions only)
    const focusResult = await db.execute({
        sql: 'SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE user_id = ? AND completed = 1',
        args: [userId]
    });
    const totalFocusHours = ((focusResult.rows[0] as any).total || 0) / 60;

    // Focus sessions in last 7 days
    const focus7dResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM focus_sessions 
              WHERE user_id = ? AND completed = 1 
              AND completed_at >= datetime('now', '-7 days')`,
        args: [userId]
    });
    const focusSessions7d = (focus7dResult.rows[0] as any).count || 0;

    // Total mood check-ins
    const moodResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM moods WHERE user_id = ?',
        args: [userId]
    });
    const totalMoodCheckins = (moodResult.rows[0] as any).count || 0;

    // Sincere goals and journals
    const sincereGoals = await getSincereGoalsCount(userId);
    const sincereJournals = await getSincereJournalCount(userId);

    // User created_at for Foundation Builder check
    const userResult = await db.execute({
        sql: 'SELECT created_at FROM users WHERE id = ?',
        args: [userId]
    });
    const userCreatedAt = (userResult.rows[0] as any)?.created_at;

    return {
        login_streak: streaks.login_streak || 0,
        check_in_streak: streaks.check_in_streak || 0,
        goal_completion_streak: streaks.goal_completion_streak || 0,
        total_focus_hours: totalFocusHours,
        focus_sessions_7d: focusSessions7d,
        total_mood_checkins: totalMoodCheckins,
        sincere_goals_completed: sincereGoals,
        sincere_journal_entries: sincereJournals,
        user_created_at: userCreatedAt,
    };
}

// ========================================
// CORE PERK CHECKING LOGIC
// ========================================

function evaluateCriteria(criteria: any, stats: any): boolean {
    const { field, operator, value } = criteria;

    // Special case: all_streaks (login, check_in, goal all >= value)
    if (field === 'all_streaks') {
        return stats.login_streak >= value &&
            stats.check_in_streak >= value &&
            stats.goal_completion_streak >= value;
    }

    // Special case: joined_before
    if (field === 'joined_before') {
        if (!stats.user_created_at) return false;
        return new Date(stats.user_created_at) < new Date(value);
    }

    const statValue = stats[field];
    if (statValue === undefined) return false;

    switch (operator) {
        case '>=': return statValue >= value;
        case '>': return statValue > value;
        case '==': return statValue === value;
        case '<=': return statValue <= value;
        case '<': return statValue < value;
        default: return false;
    }
}

export async function checkPerks(userId: string, trigger?: string): Promise<{ awarded: string[], lost: string[] }> {
    const awarded: string[] = [];
    const lost: string[] = [];

    const stats = await getUserStats(userId);

    // Get user's current perks
    const currentPerksResult = await db.execute({
        sql: 'SELECT perk_id, is_active FROM user_perks WHERE user_id = ?',
        args: [userId]
    });
    const currentPerks = new Map((currentPerksResult.rows as any[]).map(p => [p.perk_id, p.is_active]));

    for (const perk of PERK_DEFINITIONS) {
        const criteria = JSON.parse(perk.criteria_json);
        const qualifies = evaluateCriteria(criteria, stats);
        const hasPerk = currentPerks.has(perk.id);
        const isActive = currentPerks.get(perk.id) === 1;

        if (qualifies && !hasPerk) {
            // Award new perk
            await db.execute({
                sql: `INSERT OR IGNORE INTO user_perks (id, user_id, perk_id, is_active) VALUES (?, ?, ?, 1)`,
                args: [uuidv4(), userId, perk.id]
            });
            awarded.push(perk.name);
            console.log(`🏆 [PERKS] Awarded "${perk.name}" to user ${userId}`);
        } else if (qualifies && hasPerk && !isActive) {
            // Reactivate perk (user regained criteria)
            await db.execute({
                sql: `UPDATE user_perks SET is_active = 1, lost_at = NULL WHERE user_id = ? AND perk_id = ?`,
                args: [userId, perk.id]
            });
            awarded.push(perk.name);
        } else if (!qualifies && hasPerk && isActive && perk.type === 'aura') {
            // Only Aura perks can be lost
            await db.execute({
                sql: `UPDATE user_perks SET is_active = 0, lost_at = CURRENT_TIMESTAMP WHERE user_id = ? AND perk_id = ?`,
                args: [userId, perk.id]
            });
            lost.push(perk.name);
            console.log(`💔 [PERKS] User ${userId} lost aura title "${perk.name}"`);
        }
    }

    return { awarded, lost };
}

// ========================================
// API ROUTES
// ========================================

// Get all perks for current user
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;

        // First, check/update perks based on current stats
        await checkPerks(userId!);

        // Get user's active perks with definitions
        const result = await db.execute({
            sql: `SELECT up.perk_id, up.acquired_at, up.is_active,
                         pd.name, pd.type, pd.category, pd.rarity, pd.tier, pd.display_priority
                  FROM user_perks up
                  JOIN perk_definitions pd ON up.perk_id = pd.id
                  WHERE up.user_id = ? AND up.is_active = 1
                  ORDER BY pd.display_priority DESC`,
            args: [userId]
        });

        res.json({
            perks: result.rows,
            counts: {
                aura: (result.rows as any[]).filter(p => p.type === 'aura').length,
                echo: (result.rows as any[]).filter(p => p.type === 'echo').length,
                seasonal: (result.rows as any[]).filter(p => p.type === 'seasonal').length,
            }
        });
    } catch (error) {
        console.error('Get perks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get highest priority active title (for dashboard display)
// Uses user's selected perk if set, otherwise falls back to highest priority
router.get('/active-title', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;

        // First check if user has a selected perk
        const userResult = await db.execute({
            sql: `SELECT selected_perk_id FROM users WHERE id = ?`,
            args: [userId]
        });

        const selectedPerkId = (userResult.rows[0] as any)?.selected_perk_id;

        if (selectedPerkId) {
            // Check if user still has this perk active
            const selectedPerk = await db.execute({
                sql: `SELECT pd.name, pd.type, pd.rarity
                      FROM user_perks up
                      JOIN perk_definitions pd ON up.perk_id = pd.id
                      WHERE up.user_id = ? AND up.perk_id = ? AND up.is_active = 1`,
                args: [userId, selectedPerkId]
            });

            if (selectedPerk.rows.length > 0) {
                const perk = selectedPerk.rows[0] as any;
                res.json({ title: perk.name, type: perk.type, selectedPerkId });
                return;
            }
        }

        // Fall back to highest priority aura title
        const result = await db.execute({
            sql: `SELECT pd.name, pd.type, pd.rarity, up.perk_id
                  FROM user_perks up
                  JOIN perk_definitions pd ON up.perk_id = pd.id
                  WHERE up.user_id = ? AND up.is_active = 1 AND pd.type = 'aura'
                  ORDER BY pd.display_priority DESC
                  LIMIT 1`,
            args: [userId]
        });

        if (result.rows.length > 0) {
            const perk = result.rows[0] as any;
            res.json({ title: perk.name, type: 'aura', selectedPerkId: perk.perk_id });
        } else {
            res.json({ title: null });
        }
    } catch (error) {
        console.error('Get active title error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Select a perk to display as the user's active title
router.post('/select', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const { perkId } = req.body;

        if (!perkId) {
            // Clear selection
            await db.execute({
                sql: `UPDATE users SET selected_perk_id = NULL WHERE id = ?`,
                args: [userId]
            });
            res.json({ message: 'Selection cleared', selectedPerkId: null });
            return;
        }

        // Verify user has this perk and it's active
        const userPerk = await db.execute({
            sql: `SELECT up.*, pd.name, pd.type FROM user_perks up 
                  JOIN perk_definitions pd ON up.perk_id = pd.id
                  WHERE up.user_id = ? AND up.perk_id = ? AND up.is_active = 1`,
            args: [userId, perkId]
        });

        if (userPerk.rows.length === 0) {
            res.status(400).json({ message: 'You do not have this perk or it is not active' });
            return;
        }

        // Update user's selected perk
        await db.execute({
            sql: `UPDATE users SET selected_perk_id = ? WHERE id = ?`,
            args: [perkId, userId]
        });

        const perk = userPerk.rows[0] as any;
        res.json({
            message: 'Title updated',
            selectedPerkId: perkId,
            title: perk.name,
            type: perk.type
        });
    } catch (error) {
        console.error('Select perk error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get ALL perk definitions with holder counts and user progress
router.get('/all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session?.userId;

        // Get all perk definitions
        const definitions = await db.execute({
            sql: `SELECT id, name, description, type, category, rarity, tier, criteria_json, display_priority, is_limited 
                  FROM perk_definitions ORDER BY type, display_priority DESC`,
            args: []
        });

        // Get holder counts for each perk
        const holderCounts = await db.execute({
            sql: `SELECT perk_id, COUNT(*) as count FROM user_perks WHERE is_active = 1 GROUP BY perk_id`,
            args: []
        });
        const countsMap: Record<string, number> = {};
        for (const row of holderCounts.rows) {
            countsMap[(row as any).perk_id] = (row as any).count;
        }

        // Get user's earned perks
        const userPerks = await db.execute({
            sql: `SELECT perk_id, is_active FROM user_perks WHERE user_id = ?`,
            args: [userId]
        });
        const userPerksMap: Record<string, boolean> = {};
        for (const row of userPerks.rows) {
            userPerksMap[(row as any).perk_id] = (row as any).is_active === 1;
        }

        // Get user's current stats for progress calculation
        const streaks = await db.execute({ sql: `SELECT * FROM streaks WHERE user_id = ?`, args: [userId] });
        const streak = streaks.rows[0] as any || { login_streak: 0, check_in_streak: 0, goal_completion_streak: 0 };

        const focusSessions = await db.execute({
            sql: `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE user_id = ? AND completed = 1`,
            args: [userId]
        });
        const totalFocusMinutes = (focusSessions.rows[0] as any)?.total || 0;

        const goals = await db.execute({
            sql: `SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND completed = 1 
                  AND (julianday(completed_at) - julianday(created_at)) * 24 * 60 >= 5`,
            args: [userId]
        });
        const sincereGoals = (goals.rows[0] as any)?.count || 0;

        const moods = await db.execute({
            sql: `SELECT COUNT(*) as count FROM moods WHERE user_id = ?`,
            args: [userId]
        });
        const totalMoodCheckins = (moods.rows[0] as any)?.count || 0;

        const journals = await db.execute({
            sql: `SELECT COUNT(*) as count FROM journal WHERE user_id = ? AND LENGTH(content) >= 20`,
            args: [userId]
        });
        const sincereJournals = (journals.rows[0] as any)?.count || 0;

        // Build response with progress info
        const perksWithInfo = definitions.rows.map((perk: any) => {
            const criteria = JSON.parse(perk.criteria_json);
            let currentValue = 0;
            let targetValue = criteria.value || 0;
            let requirementText = '';

            // Calculate current value and requirement text
            switch (criteria.field) {
                case 'login_streak':
                    currentValue = streak.login_streak;
                    requirementText = `${targetValue}-day login streak`;
                    break;
                case 'check_in_streak':
                    currentValue = streak.check_in_streak;
                    requirementText = `${targetValue}-day check-in streak`;
                    break;
                case 'goal_completion_streak':
                    currentValue = streak.goal_completion_streak;
                    requirementText = `${targetValue}-day goal completion streak`;
                    break;
                case 'all_streaks':
                    currentValue = Math.min(streak.login_streak, streak.check_in_streak, streak.goal_completion_streak);
                    requirementText = `All 3 streaks at ${targetValue}+ days`;
                    break;
                case 'total_focus_hours':
                    currentValue = Math.floor(totalFocusMinutes / 60);
                    requirementText = `${targetValue} hours of focus time`;
                    break;
                case 'focus_sessions_7d':
                    currentValue = 0; // TODO: calculate 7-day sessions
                    requirementText = `${targetValue} focus sessions in 7 days`;
                    break;
                case 'sincere_goals_completed':
                    currentValue = sincereGoals;
                    requirementText = `${targetValue} goals completed sincerely`;
                    break;
                case 'total_mood_checkins':
                    currentValue = totalMoodCheckins;
                    requirementText = `${targetValue} mood check-ins`;
                    break;
                case 'sincere_journal_entries':
                    currentValue = sincereJournals;
                    requirementText = `${targetValue} meaningful journal entries`;
                    break;
                case 'joined_before':
                    requirementText = `Early adopter (joined before ${criteria.value})`;
                    currentValue = 1; // Check would need actual join date
                    break;
                default:
                    requirementText = 'Special achievement';
            }

            return {
                id: perk.id,
                name: perk.name,
                description: perk.description,
                type: perk.type,
                category: perk.category,
                rarity: perk.rarity,
                tier: perk.tier,
                requirement: requirementText,
                holderCount: countsMap[perk.id] || 0,
                earned: !!userPerksMap[perk.id],
                active: userPerksMap[perk.id] === true,
                progress: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0,
                currentValue,
                targetValue
            };
        });

        res.json({ perks: perksWithInfo });
    } catch (error) {
        console.error('Get all perks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Seed perk definitions (run once on startup)
export async function seedPerkDefinitions() {
    for (const perk of PERK_DEFINITIONS) {
        try {
            await db.execute({
                sql: `INSERT OR IGNORE INTO perk_definitions 
                      (id, name, type, category, rarity, tier, criteria_json, display_priority, is_limited) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    perk.id,
                    perk.name,
                    perk.type,
                    perk.category,
                    perk.rarity,
                    perk.tier,
                    perk.criteria_json,
                    perk.display_priority,
                    (perk as any).is_limited || 0
                ]
            });
        } catch (e) {
            // Ignore if already exists
        }
    }
    console.log('✅ Perk definitions seeded');
}

export const perkRoutes = router;
