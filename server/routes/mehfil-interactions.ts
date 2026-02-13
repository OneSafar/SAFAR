import { Router } from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";

export const mehfilInteractionsRouter = Router();

// ----------------------------------------------------------------------
// COMMENTS
// ----------------------------------------------------------------------

// Get comments for a thought
mehfilInteractionsRouter.get("/:thoughtId/comments", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const result = await db.query(
            `SELECT 
                c.id, 
                c.content, 
                c.created_at, 
                u.name as author_name, 
                u.avatar as author_avatar,
                u.id as user_id 
             FROM mehfil_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.thought_id = $1
             ORDER BY c.created_at ASC`,
            [thoughtId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// Post a comment
mehfilInteractionsRouter.post("/:thoughtId/comments", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const { userId, content } = req.body;

        if (!userId || !content) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO mehfil_comments (id, thought_id, user_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, thoughtId, userId, content]
        );

        // Fetch user details to return complete comment object
        const userResult = await db.query(
            "SELECT name, avatar FROM users WHERE id = $1",
            [userId]
        );
        const user = userResult.rows[0];

        res.status(201).json({
            ...result.rows[0],
            author_name: user?.name || "Unknown",
            author_avatar: user?.avatar
        });
    } catch (error) {
        console.error("Error posting comment:", error);
        res.status(500).json({ error: "Failed to post comment" });
    }
});

// ----------------------------------------------------------------------
// SAVES (Bookmarks)
// ----------------------------------------------------------------------

// Toggle save status
mehfilInteractionsRouter.post("/:thoughtId/save", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: "Missing userId" });
            return;
        }

        // Check if already saved
        const existing = await db.query(
            "SELECT * FROM mehfil_saves WHERE user_id = $1 AND thought_id = $2",
            [userId, thoughtId]
        );

        if (existing.rows.length > 0) {
            // Unsave
            await db.query(
                "DELETE FROM mehfil_saves WHERE user_id = $1 AND thought_id = $2",
                [userId, thoughtId]
            );
            res.json({ saved: false });
        } else {
            // Save
            await db.query(
                "INSERT INTO mehfil_saves (user_id, thought_id) VALUES ($1, $2)",
                [userId, thoughtId]
            );
            res.json({ saved: true });
        }
    } catch (error) {
        console.error("Error toggling save:", error);
        res.status(500).json({ error: "Failed to toggle save" });
    }
});

// Check if saved
mehfilInteractionsRouter.get("/:thoughtId/save/check", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            res.status(400).json({ error: "Missing userId" });
            return;
        }

        const result = await db.query(
            "SELECT * FROM mehfil_saves WHERE user_id = $1 AND thought_id = $2",
            [userId, thoughtId]
        );

        res.json({ saved: result.rows.length > 0 });
    } catch (error) {
        console.error("Error checking save status:", error);
        res.status(500).json({ error: "Failed to check save status" });
    }
});

// ----------------------------------------------------------------------
// REPORTS
// ----------------------------------------------------------------------

mehfilInteractionsRouter.post("/:thoughtId/report", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const { userId, reason } = req.body;

        if (!userId || !reason) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const id = uuidv4();
        await db.query(
            `INSERT INTO mehfil_reports (id, thought_id, reporter_id, reason)
             VALUES ($1, $2, $3, $4)`,
            [id, thoughtId, userId, reason]
        );

        res.status(201).json({ message: "Report submitted successfully" });
    } catch (error) {
        console.error("Error submitting report:", error);
        res.status(500).json({ error: "Failed to submit report" });
    }
});

// ----------------------------------------------------------------------
// SHARES
// ----------------------------------------------------------------------

mehfilInteractionsRouter.post("/:thoughtId/share", async (req, res) => {
    try {
        const { thoughtId } = req.params;
        const { userId, platform } = req.body;

        if (!userId) {
            res.status(400).json({ error: "Missing userId" });
            return;
        }

        const id = uuidv4();
        await db.query(
            `INSERT INTO mehfil_shares (id, thought_id, user_id, platform)
             VALUES ($1, $2, $3, $4)`,
            [id, thoughtId, userId, platform || "generic"]
        );

        res.status(201).json({ message: "Share logged" });
    } catch (error) {
        console.error("Error logging share:", error);
        res.status(500).json({ error: "Failed to log share" });
    }
});
