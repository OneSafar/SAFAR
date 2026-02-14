import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ========================================
// ACHIEVEMENT DEFINITIONS (Simplified)
// ========================================

const ACHIEVEMENT_DEFINITIONS = [
    // ── GOAL COMPLETION BADGES ──────────────────────────────────
    // Earned by completing cumulative goals across all time
    { id: 'G001', name: 'First Steps',      type: 'badge', category: 'goals', tier: 1, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 5 }),   display_priority: 15 },
    { id: 'G002', name: 'Goal Crusher',     type: 'badge', category: 'goals', tier: 2, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 25 }),  display_priority: 25 },
    { id: 'G003', name: 'Unstoppable',      type: 'badge', category: 'goals', tier: 3, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 50 }),  display_priority: 35 },
    { id: 'G004', name: 'The Centurion',    type: 'badge', category: 'goals', tier: 4, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 100 }), display_priority: 45 },

    // ── FOCUS SESSION BADGES ────────────────────────────────────
    // Earned by accumulating total focus hours in Ekagra mode
    { id: 'F001', name: 'Deep Diver',       type: 'badge', category: 'focus', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 5 }),   display_priority: 10 },
    { id: 'F002', name: 'Focus Master',     type: 'badge', category: 'focus', tier: 2, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 25 }),  display_priority: 20 },
    { id: 'F003', name: 'Zone Warrior',     type: 'badge', category: 'focus', tier: 3, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 75 }),  display_priority: 30 },
    { id: 'F004', name: 'Monk Mode',        type: 'badge', category: 'focus', tier: 4, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 200 }), display_priority: 40 },
    { id: 'F005', name: 'Legendary Focus',  type: 'badge', category: 'focus', tier: 5, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 500 }), display_priority: 50 },

    // ── CHECK-IN STREAK BADGES ──────────────────────────────────
    // Earned by maintaining consecutive daily mood check-ins
    { id: 'S001', name: 'Streak Starter',   type: 'badge', category: 'streak', tier: 1, criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 7 }),  display_priority: 17 },
    { id: 'S002', name: 'Iron Will',        type: 'badge', category: 'streak', tier: 2, criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 30 }), display_priority: 27 },

    // ── SPECIAL BADGE ───────────────────────────────────────────
    // Earned by reaching a quick focus milestone
    { id: 'ET006', name: 'Flow State',      type: 'badge', category: 'emotional', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 2 }), display_priority: 55 },

    // ── TITLES: GOAL COMPLETION ─────────────────────────────────
    // Permanent titles earned by cumulative goal completions
    { id: 'T005', name: 'Heavy Heart High Effort', type: 'title', category: 'goals', tier: 1, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 10 }),  display_priority: 60 },
    { id: 'T006', name: 'Mindset of a Warrior',    type: 'title', category: 'goals', tier: 2, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 50 }),  display_priority: 61 },
    { id: 'T007', name: 'Exhaustion to Excellence', type: 'title', category: 'goals', tier: 3, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 100 }), display_priority: 62 },
    { id: 'T008', name: 'High Energy Ace',          type: 'title', category: 'goals', tier: 4, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 500 }), display_priority: 63 },

    // ── TITLES: LOGIN STREAKS ───────────────────────────────────
    // Permanent titles earned by maintaining consecutive daily logins
    { id: 'T001', name: 'Tired But Triumphant',     type: 'title', category: 'streak', tier: 1, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 3 }),  display_priority: 70 },
    { id: 'T002', name: 'Restless Yet Relentless',   type: 'title', category: 'streak', tier: 2, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 7 }),  display_priority: 71 },
    { id: 'T003', name: 'Strong Comeback',            type: 'title', category: 'streak', tier: 3, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 14 }), display_priority: 72 },
    { id: 'T004', name: 'Top Tier Energy',            type: 'title', category: 'streak', tier: 4, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 30 }), display_priority: 73 },
];

// ========================================
// EMOTIONAL MILESTONE TITLES (On-demand)
// ========================================

const EMOTIONAL_TITLES = [
    { id: 'ET001', name: 'Showed Up Tired',           description: 'Checked in feeling low but still focused for over 30 minutes — true resilience', trigger: 'low_mood_focus' },
    { id: 'ET002', name: 'Did It Anyway',             description: 'Faced multiple tough days this week but kept your focus hours high', trigger: 'low_mood_high_focus' },
    { id: 'ET003', name: 'Quiet Consistency',         description: 'Showed up and focused for 5 or more days this week — quiet consistency wins', trigger: 'consistent_focus' },
    { id: 'ET004', name: 'Survived Bad Week',         description: 'Kept focusing through a challenging week when your mood was low', trigger: 'bad_week_focus' },
    { id: 'ET005', name: 'Pushed Through Overwhelm',  description: 'Your journal showed struggle, but you pushed through and stayed focused', trigger: 'overwhelm_focus' },
];

// ========================================
// DATA FETCHING
// ========================================

async function getUserStats(userId: string) {
    // Total focus hours (completed sessions only)
    const focusResult = await db.execute({
        sql: 'SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE user_id = ? AND completed = TRUE',
        args: [userId]
    });
    const totalFocusHours = ((focusResult.rows[0] as any).total || 0) / 60;

    // Total goals completed
    const goalsResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND completed = TRUE',
        args: [userId]
    });
    const goalsCompleted = (goalsResult.rows[0] as any).count || 0;

    // Get check-in streak
    const streakResult = await db.execute({
        sql: 'SELECT check_in_streak, login_streak FROM streaks WHERE user_id = ?',
        args: [userId]
    });
    const checkInStreak = (streakResult.rows[0] as any)?.check_in_streak || 0;
    const loginStreak = (streakResult.rows[0] as any)?.login_streak || 0;

    return {
        total_focus_hours: totalFocusHours,
        goals_completed: goalsCompleted,
        check_in_streak: checkInStreak,
        login_streak: loginStreak,
    };
}

async function getWeeklyMoodData(userId: string) {
    // Get moods from last 7 days
    const moodsResult = await db.execute({
        sql: `SELECT mood, intensity, notes, timestamp FROM moods 
              WHERE user_id = ? AND timestamp >= NOW() - INTERVAL '7 days'
              ORDER BY timestamp DESC`,
        args: [userId]
    });
    const moods = moodsResult.rows as any[];

    // Calculate average mood intensity
    const avgMood = moods.length > 0
        ? moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length
        : 3;

    // Count low mood days (intensity <= 2)
    const lowMoodDays = moods.filter(m => m.intensity <= 2).length;

    // Get focus hours this week
    const focusResult = await db.execute({
        sql: `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions 
              WHERE user_id = ? AND completed = TRUE AND completed_at >= NOW() - INTERVAL '7 days'`,
        args: [userId]
    });
    const weeklyFocusHours = ((focusResult.rows[0] as any).total || 0) / 60;

    // Get goals completed this week
    const goalsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM goals 
              WHERE user_id = ? AND completed = TRUE AND completed_at >= NOW() - INTERVAL '7 days'`,
        args: [userId]
    });
    const weeklyGoals = (goalsResult.rows[0] as any).count || 0;

    // Check for streak recovery (simplified: check if user logged in today after missing yesterday)
    const streaksResult = await db.execute({
        sql: 'SELECT login_streak, check_in_streak, goal_completion_streak FROM streaks WHERE user_id = ?',
        args: [userId]
    });
    const streaks = streaksResult.rows[0] as any || {};

    // Check journal for struggle keywords
    const journalResult = await db.execute({
        sql: `SELECT content FROM journal 
              WHERE user_id = ? AND timestamp >= NOW() - INTERVAL '7 days'`,
        args: [userId]
    });
    const struggleKeywords = ['stress', 'overwhelm', 'tired', 'exhausted', 'burnout', 'sad', 'anxious', 'difficult'];
    const hasStruggleJournal = (journalResult.rows as any[]).some(j =>
        struggleKeywords.some(kw => j.content.toLowerCase().includes(kw))
    );

    return {
        avgMood,
        lowMoodDays,
        weeklyFocusHours,
        weeklyGoals,
        checkIns: moods.length,
        hasStruggleJournal,
        streakRecovered: streaks.login_streak >= 2, // Simplified check
    };
}

// ========================================
// CORE ACHIEVEMENT LOGIC
// ========================================

function evaluateCriteria(criteria: any, stats: any): boolean {
    const { field, operator, value } = criteria;
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

export async function checkAchievements(userId: string): Promise<{ awarded: string[], lost: string[] }> {
    const awarded: string[] = [];
    const lost: string[] = [];

    const stats = await getUserStats(userId);

    // Get user's current achievements
    const currentResult = await db.execute({
        sql: 'SELECT achievement_id, is_active FROM user_achievements WHERE user_id = ?',
        args: [userId]
    });
    const currentAchievements = new Map((currentResult.rows as any[]).map(a => [a.achievement_id, a.is_active]));

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        const criteria = JSON.parse(achievement.criteria_json);
        const qualifies = evaluateCriteria(criteria, stats);
        const hasAchievement = currentAchievements.has(achievement.id);

        if (qualifies && !hasAchievement) {
            // Award new achievement
            await db.execute({
                sql: `INSERT INTO user_achievements (id, user_id, achievement_id, is_active) VALUES (?, ?, ?, TRUE) ON CONFLICT DO NOTHING`,
                args: [uuidv4(), userId, achievement.id]
            });
            awarded.push(achievement.name);
            console.log(`🏆 [ACHIEVEMENTS] Awarded "${achievement.name}" to user ${userId}`);
        }
    }

    return { awarded, lost };
}

// Evaluate emotional milestones on demand
async function evaluateEmotionalMilestone(userId: string): Promise<{ title: string | null, description: string | null }> {
    const weekData = await getWeeklyMoodData(userId);

    // Get max single session duration for "Flow Seeker"
    const maxSessionResult = await db.execute({
        sql: `SELECT MAX(duration_minutes) as max_duration FROM focus_sessions 
              WHERE user_id = ? AND completed = TRUE AND completed_at >= NOW() - INTERVAL '7 days'`,
        args: [userId]
    });
    const maxSessionMinutes = (maxSessionResult.rows[0] as any).max_duration || 0;

    // Check for "Quiet Consistency" (focused on 5+ distinct days)
    const distinctDaysResult = await db.execute({
        sql: `SELECT COUNT(DISTINCT DATE(completed_at)) as days FROM focus_sessions 
              WHERE user_id = ? AND completed = TRUE AND completed_at >= NOW() - INTERVAL '7 days'`,
        args: [userId]
    });
    const focusDays = (distinctDaysResult.rows[0] as any).days || 0;


    // Priority order
    if (weekData.avgMood < 2.5 && weekData.weeklyFocusHours > 5) {
        return { title: 'Survived Bad Week', description: 'You kept focusing through a challenging week when your mood was low.' };
    }

    if (maxSessionMinutes >= 120) {
        return { title: 'Flow State', description: 'You achieved a massive 2+ hour deep work session!' };
    }

    if (weekData.lowMoodDays >= 3 && weekData.weeklyFocusHours >= 5) {
        return { title: 'Did It Anyway', description: 'Multiple tough days, but you still showed up and focused.' };
    }

    if (focusDays >= 5) {
        return { title: 'Quiet Consistency', description: 'You showed up and focused for 5+ days this week. Quiet consistency wins.' };
    }

    if (weekData.lowMoodDays >= 1 && weekData.weeklyFocusHours >= 1) {
        return { title: 'Showed Up Tired', description: 'You checked in feeling low but still focused — true resilience.' };
    }

    if (weekData.hasStruggleJournal && weekData.weeklyFocusHours >= 2) {
        return { title: 'Pushed Through Overwhelm', description: 'Your journal showed struggle, but you pushed through and stayed focused!' };
    }

    return { title: null, description: null };
}

// ========================================
// API ROUTES
// ========================================

// Get all achievements for current user
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        await checkAchievements(userId!);

        const result = await db.execute({
            sql: `SELECT ua.achievement_id, ua.acquired_at, ua.is_active,
                         ad.name, ad.type, ad.category, ad.rarity, ad.tier, ad.display_priority
                  FROM user_achievements ua
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.is_active = TRUE
                  ORDER BY ad.display_priority DESC`,
            args: [userId]
        });

        res.json({
            achievements: result.rows,
            counts: {
                badges: (result.rows as any[]).filter(a => a.type === 'badge').length,
                titles: (result.rows as any[]).filter(a => a.type === 'title').length,
            }
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get active title (for dashboard display)
router.get('/active-title', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;

        const userResult = await db.execute({
            sql: `SELECT selected_achievement_id FROM users WHERE id = ?`,
            args: [userId]
        });

        const selectedId = (userResult.rows[0] as any)?.selected_achievement_id;

        if (selectedId) {
            const result = await db.execute({
                sql: `SELECT ad.name, ad.type, ad.rarity
                      FROM user_achievements ua
                      JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                      WHERE ua.user_id = ? AND ua.achievement_id = ? AND ua.is_active = TRUE`,
                args: [userId, selectedId]
            });

            if (result.rows.length > 0) {
                const achievement = result.rows[0] as any;
                res.json({ title: achievement.name, type: achievement.type, selectedId });
                return;
            }
        }

        // Fall back to highest priority achievement
        const result = await db.execute({
            sql: `SELECT ad.name, ad.type, ad.rarity, ua.achievement_id
                  FROM user_achievements ua
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.is_active = TRUE
                  ORDER BY ad.display_priority DESC
                  LIMIT 1`,
            args: [userId]
        });

        if (result.rows.length > 0) {
            const achievement = result.rows[0] as any;
            res.json({ title: achievement.name, type: achievement.type, selectedId: achievement.achievement_id });
        } else {
            res.json({ title: null });
        }
    } catch (error) {
        console.error('Get active title error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Select an achievement as active title
router.post('/select', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const { achievementId } = req.body;

        if (!achievementId) {
            await db.execute({
                sql: `UPDATE users SET selected_achievement_id = NULL WHERE id = ?`,
                args: [userId]
            });
            res.json({ message: 'Selection cleared', selectedId: null });
            return;
        }

        // Verify user has this achievement
        const userAchievement = await db.execute({
            sql: `SELECT ua.*, ad.name, ad.type FROM user_achievements ua 
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.achievement_id = ? AND ua.is_active = TRUE`,
            args: [userId, achievementId]
        });

        if (userAchievement.rows.length === 0) {
            res.status(400).json({ message: 'You do not have this achievement' });
            return;
        }

        await db.execute({
            sql: `UPDATE users SET selected_achievement_id = ? WHERE id = ?`,
            args: [achievementId, userId]
        });

        const achievement = userAchievement.rows[0] as any;
        res.json({
            message: 'Title updated',
            selectedId: achievementId,
            title: achievement.name,
            type: achievement.type
        });
    } catch (error) {
        console.error('Select achievement error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// TEMPORARY DEBUG ROUTE
router.get('/debug/duplicates', async (req, res) => {
    try {
        const result = await db.execute({
            sql: `SELECT name, COUNT(*) as count, array_agg(id) as ids 
                  FROM achievement_definitions 
                  GROUP BY name 
                  HAVING COUNT(*) > 1`,
            args: []
        });
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get ALL achievement definitions with progress
router.get('/all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session?.userId;

        // IMPORTANT: Check and award achievements based on current stats FIRST
        await checkAchievements(userId);

        // Get all definitions
        const definitions = await db.execute({
            sql: `SELECT id, name, description, type, category, rarity, tier, criteria_json, display_priority 
                  FROM achievement_definitions ORDER BY category, display_priority DESC`,
            args: []
        });

        // Get user's stats
        const stats = await getUserStats(userId);

        // Get user's earned achievements
        const userAchievements = await db.execute({
            sql: `SELECT achievement_id FROM user_achievements WHERE user_id = ? AND is_active = TRUE`,
            args: [userId]
        });
        const earnedIds = new Set((userAchievements.rows as any[]).map(a => a.achievement_id));

        // Get holder counts
        const holderCounts = await db.execute({
            sql: `SELECT achievement_id, COUNT(*) as count FROM user_achievements WHERE is_active = TRUE GROUP BY achievement_id`,
            args: []
        });
        const countsMap: Record<string, number> = {};
        for (const row of holderCounts.rows) {
            countsMap[(row as any).achievement_id] = (row as any).count;
        }

        // Build response
        const achievementsWithInfo = definitions.rows.map((achievement: any) => {
            const criteria = JSON.parse(achievement.criteria_json);
            let currentValue = 0;
            let targetValue = criteria.value || 0;
            let requirementText = '';

            switch (criteria.field) {
                case 'total_focus_hours':
                    currentValue = Math.floor(stats.total_focus_hours);
                    requirementText = `Focus for ${targetValue} total hours in Ekagra mode`;
                    break;
                case 'goals_completed':
                    currentValue = stats.goals_completed;
                    requirementText = `Complete ${targetValue} goals across all time`;
                    break;
                case 'check_in_streak':
                    currentValue = stats.check_in_streak;
                    requirementText = `Maintain a ${targetValue}-day daily check-in streak`;
                    break;
                case 'login_streak':
                    currentValue = stats.login_streak;
                    requirementText = `Log in for ${targetValue} consecutive days`;
                    break;
                default:
                    requirementText = 'Awarded based on your weekly emotional journey';
            }

            return {
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                type: achievement.type,
                category: achievement.category,
                rarity: achievement.rarity,
                tier: achievement.tier,
                requirement: requirementText,
                holderCount: countsMap[achievement.id] || 0,
                earned: earnedIds.has(achievement.id),
                progress: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0,
                currentValue,
                targetValue
            };
        });

        res.json({ achievements: achievementsWithInfo });
    } catch (error) {
        console.error('Get all achievements error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Evaluate emotional milestone (on-demand)
router.post('/evaluate-week', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const milestone = await evaluateEmotionalMilestone(userId);

        if (milestone.title) {
            // Award the emotional title
            const titleDef = EMOTIONAL_TITLES.find(t => t.name === milestone.title);
            if (titleDef) {
                await db.execute({
                    sql: `INSERT INTO user_achievements (id, user_id, achievement_id, is_active, acquired_at) 
                          VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP) ON CONFLICT (user_id, achievement_id) DO UPDATE SET is_active = TRUE, acquired_at = CURRENT_TIMESTAMP`,
                    args: [uuidv4(), userId, titleDef.id]
                });
                console.log(`🎭 [EMOTIONAL] Awarded "${milestone.title}" to user ${userId}`);
            }
        }

        res.json(milestone);
    } catch (error) {
        console.error('Evaluate week error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Seed achievement definitions (run once on startup)
export async function seedAchievementDefinitions() {
    // Seed badge definitions
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        try {
            await db.execute({
                sql: `INSERT INTO achievement_definitions 
                      (id, name, type, category, tier, criteria_json, display_priority) 
                      VALUES (?, ?, ?, ?, ?, ?, ?) 
                      ON CONFLICT (id) DO UPDATE SET 
                      name = EXCLUDED.name, type = EXCLUDED.type, category = EXCLUDED.category,
                      tier = EXCLUDED.tier, criteria_json = EXCLUDED.criteria_json, display_priority = EXCLUDED.display_priority`,
                args: [
                    achievement.id,
                    achievement.name,
                    achievement.type,
                    achievement.category,
                    achievement.tier,
                    achievement.criteria_json,
                    achievement.display_priority,
                ]
            });
        } catch (e) {
            // Ignore if already exists
        }
    }

    // Seed emotional titles
    for (const title of EMOTIONAL_TITLES) {
        try {
            await db.execute({
                sql: `INSERT INTO achievement_definitions 
                      (id, name, description, type, category, rarity, tier, criteria_json, display_priority) 
                      VALUES (?, ?, ?, 'title', 'emotional', 'special', NULL, '{}', 60)
                      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
                args: [title.id, title.name, title.description]
            });
        } catch (e) {
            // Ignore if already exists
        }
    }


    console.log('✅ Achievement definitions seeded');
}

export const achievementRoutes = router;
