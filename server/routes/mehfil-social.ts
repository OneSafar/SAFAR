import { Router, Request, Response } from "express";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";

export const mehfilSocialRouter = Router();

// All routes require authentication
mehfilSocialRouter.use(requireAuth);

// ═══════════════════════════════════════════════════════════
// SAVED POSTS
// ═══════════════════════════════════════════════════════════

// Get all saved posts for current user
mehfilSocialRouter.get("/saved-posts", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    // Get saved posts with full thought details
    const result = await pool.query(
      `SELECT 
        t.id, 
        t.user_id as "userId",
        t.author_name as "authorName",
        t.author_avatar as "authorAvatar",
        t.content,
        t.image_url as "imageUrl",
        t.relatable_count as "relatableCount",
        t.created_at as "createdAt",
        s.created_at as "savedAt"
      FROM mehfil_saves s
      JOIN mehfil_thoughts t ON s.thought_id = t.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
      [userId]
    );

    // Get user's reactions for these thoughts
    const thoughtIds = result.rows.map(row => row.id);
    let reactedThoughtIds: string[] = [];

    if (thoughtIds.length > 0) {
      const reactionsResult = await pool.query(
        `SELECT thought_id as "thoughtId"
        FROM mehfil_reactions
        WHERE user_id = $1 AND thought_id = ANY($2)`,
        [userId, thoughtIds]
      );
      reactedThoughtIds = reactionsResult.rows.map(r => r.thoughtId);
    }

    res.json({
      posts: result.rows,
      reactedThoughtIds
    });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ error: "Failed to fetch saved posts" });
  }
});

// ═══════════════════════════════════════════════════════════
// FRIENDS / CONNECTIONS
// ═══════════════════════════════════════════════════════════

// Get all friends/connections for current user
mehfilSocialRouter.get("/friends", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    // Get all friendships where user is either sender or receiver
    const result = await pool.query(
      `SELECT 
        f.id,
        f.status,
        f.created_at,
        f.accepted_at,
        CASE 
          WHEN f.user_id = $1 THEN f.friend_id
          ELSE f.user_id
        END as friend_user_id,
        u.name,
        u.avatar,
        CASE 
          WHEN f.user_id = $1 THEN 'requested'
          ELSE 'pending'
        END as request_type
      FROM mehfil_friendships f
      JOIN users u ON (
        CASE 
          WHEN f.user_id = $1 THEN f.friend_id = u.id
          ELSE f.user_id = u.id
        END
      )
      WHERE (f.user_id = $1 OR f.friend_id = $1)
      AND f.status != 'rejected'
      ORDER BY 
        CASE 
          WHEN f.status = 'pending' AND f.friend_id = $1 THEN 0
          WHEN f.status = 'accepted' THEN 1
          ELSE 2
        END,
        f.created_at DESC`,
      [userId]
    );

    const friends = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      status: row.status === 'accepted' ? 'accepted' : row.request_type,
      created_at: row.created_at
    }));

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Send friend request
mehfilSocialRouter.post("/friends/request", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: "Friend ID is required" });
    }

    if (userId === friendId) {
      return res.status(400).json({ error: "Cannot connect with yourself" });
    }

    // Check if friendship already exists
    const existing = await pool.query(
      `SELECT id, status FROM mehfil_friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
       OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      if (status === 'accepted') {
        return res.status(400).json({ error: "Already connected" });
      } else if (status === 'pending') {
        return res.status(400).json({ error: "Friend request already sent" });
      }
    }

    const friendshipId = uuidv4();
    await pool.query(
      `INSERT INTO mehfil_friendships (id, user_id, friend_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [friendshipId, userId, friendId]
    );

    res.status(201).json({
      message: "Friend request sent",
      friendshipId
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// Accept friend request
mehfilSocialRouter.post("/friends/:friendshipId/accept", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendshipId } = req.params;

    // Verify the user is the recipient of this request
    const result = await pool.query(
      `UPDATE mehfil_friendships
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1 AND friend_id = $2 AND status = 'pending'
       RETURNING *`,
      [friendshipId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Friend request not found or already processed" });
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// Remove friend / Reject request
mehfilSocialRouter.delete("/friends/:friendshipId", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendshipId } = req.params;

    // Delete friendship where user is involved
    const result = await pool.query(
      `DELETE FROM mehfil_friendships
       WHERE id = $1 AND (user_id = $2 OR friend_id = $2)
       RETURNING *`,
      [friendshipId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({ message: "Connection removed" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove connection" });
  }
});

// Check friendship status with another user
mehfilSocialRouter.get("/friends/status/:targetUserId", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.json({ status: 'self' });
    }

    const result = await pool.query(
      `SELECT 
        id,
        status,
        CASE 
          WHEN user_id = $1 THEN 'sent'
          ELSE 'received'
        END as direction
       FROM mehfil_friendships
       WHERE (user_id = $1 AND friend_id = $2) 
       OR (user_id = $2 AND friend_id = $1)`,
      [userId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'none' });
    }

    const friendship = result.rows[0];
    res.json({
      status: friendship.status,
      direction: friendship.direction,
      friendshipId: friendship.id
    });
  } catch (error) {
    console.error("Error checking friendship status:", error);
    res.status(500).json({ error: "Failed to check friendship status" });
  }
});

// ═══════════════════════════════════════════════════════════
// USER ANALYTICS
// ═══════════════════════════════════════════════════════════

mehfilSocialRouter.get("/analytics", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    // Get total thoughts posted
    const thoughtsResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_thoughts WHERE user_id = $1`,
      [userId]
    );

    // Get total reactions given
    const reactionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_reactions WHERE user_id = $1`,
      [userId]
    );

    // Get total comments posted
    const commentsResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_comments WHERE user_id = $1`,
      [userId]
    );

    // Get total saves
    const savesResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_saves WHERE user_id = $1`,
      [userId]
    );

    // Get total shares
    const sharesResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_shares WHERE user_id = $1`,
      [userId]
    );

    // Get friends count
    const friendsResult = await pool.query(
      `SELECT COUNT(*) as count FROM mehfil_friendships 
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [userId]
    );

    // Get user's join date
    const userResult = await pool.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId]
    );

    res.json({
      totalThoughts: parseInt(thoughtsResult.rows[0].count),
      totalReactions: parseInt(reactionsResult.rows[0].count),
      totalComments: parseInt(commentsResult.rows[0].count),
      totalSaves: parseInt(savesResult.rows[0].count),
      totalShares: parseInt(sharesResult.rows[0].count),
      friendsCount: parseInt(friendsResult.rows[0].count),
      joinedDate: userResult.rows[0]?.created_at || new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default mehfilSocialRouter;
