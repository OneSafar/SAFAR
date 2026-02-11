import { Server, Socket } from 'socket.io';
import { db, pool } from '../db';
import { v4 as uuidv4 } from 'uuid';

export function setupMehfilSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('🔌 Mehfil client connected:', socket.id);

        // ═══════════════════════════════════════════════════════════
        // Load all thoughts (newest first, paginated)
        // ═══════════════════════════════════════════════════════════
        socket.on('thoughts:load', async (data?: { limit?: number; offset?: number }) => {
            try {
                const limit = data?.limit || 50;
                const offset = data?.offset || 0;

                const result = await pool.query(
                    `SELECT 
                        id, user_id as "userId", author_name as "authorName", 
                        author_avatar as "authorAvatar", content, image_url as "imageUrl",
                        relatable_count as "relatableCount", created_at as "createdAt"
                    FROM mehfil_thoughts
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );

                socket.emit('thoughts:list', result.rows);
            } catch (error) {
                console.error('Error loading thoughts:', error);
                socket.emit('thoughts:list', []);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Create a new thought
        // ═══════════════════════════════════════════════════════════
        socket.on('thought:create', async (data: {
            userId: string;
            authorName: string;
            authorAvatar?: string;
            content: string;
            imageUrl?: string;
        }) => {
            try {
                if (!data.userId || !data.content?.trim()) {
                    console.error('Invalid thought data:', data);
                    return;
                }

                const thoughtId = uuidv4();
                const now = new Date().toISOString();

                await pool.query(
                    `INSERT INTO mehfil_thoughts 
                    (id, user_id, author_name, author_avatar, content, image_url, relatable_count, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
                    [
                        thoughtId,
                        data.userId,
                        data.authorName,
                        data.authorAvatar || null,
                        data.content.trim(),
                        data.imageUrl || null,
                        now
                    ]
                );

                const newThought = {
                    id: thoughtId,
                    userId: data.userId,
                    authorName: data.authorName,
                    authorAvatar: data.authorAvatar || null,
                    content: data.content.trim(),
                    imageUrl: data.imageUrl || null,
                    relatableCount: 0,
                    createdAt: now
                };

                // Broadcast to all connected clients
                io.emit('thought:new', newThought);
                console.log('✅ New thought created:', thoughtId);
            } catch (error) {
                console.error('Error creating thought:', error);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Toggle relatable reaction on a thought
        // ═══════════════════════════════════════════════════════════
        socket.on('thought:react', async (data: {
            thoughtId: string;
            userId: string;
        }) => {
            try {
                if (!data.thoughtId || !data.userId) {
                    console.error('Invalid reaction data:', data);
                    return;
                }

                // Check if user already reacted
                const existingReaction = await pool.query(
                    `SELECT id FROM mehfil_reactions 
                    WHERE thought_id = $1 AND user_id = $2`,
                    [data.thoughtId, data.userId]
                );

                if (existingReaction.rows.length > 0) {
                    // Remove reaction (toggle off)
                    await pool.query(
                        `DELETE FROM mehfil_reactions 
                        WHERE thought_id = $1 AND user_id = $2`,
                        [data.thoughtId, data.userId]
                    );

                    // Decrement count
                    await pool.query(
                        `UPDATE mehfil_thoughts 
                        SET relatable_count = GREATEST(relatable_count - 1, 0)
                        WHERE id = $1`,
                        [data.thoughtId]
                    );
                } else {
                    // Add reaction (toggle on)
                    const reactionId = uuidv4();
                    await pool.query(
                        `INSERT INTO mehfil_reactions (id, thought_id, user_id)
                        VALUES ($1, $2, $3)`,
                        [reactionId, data.thoughtId, data.userId]
                    );

                    // Increment count
                    await pool.query(
                        `UPDATE mehfil_thoughts 
                        SET relatable_count = relatable_count + 1
                        WHERE id = $1`,
                        [data.thoughtId]
                    );
                }

                // Get updated count
                const result = await pool.query(
                    `SELECT relatable_count as "relatableCount" 
                    FROM mehfil_thoughts 
                    WHERE id = $1`,
                    [data.thoughtId]
                );

                const newCount = result.rows[0]?.relatableCount || 0;

                // Broadcast updated count to all clients
                io.emit('thought:reaction_updated', {
                    thoughtId: data.thoughtId,
                    relatableCount: newCount
                });

                console.log('✅ Reaction toggled for thought:', data.thoughtId);
            } catch (error) {
                console.error('Error toggling reaction:', error);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Get user's reaction status for thoughts
        // ═══════════════════════════════════════════════════════════
        socket.on('thoughts:get_user_reactions', async (data: {
            userId: string;
            thoughtIds: string[];
        }) => {
            try {
                if (!data.userId || !data.thoughtIds?.length) {
                    socket.emit('thoughts:user_reactions', []);
                    return;
                }

                const result = await pool.query(
                    `SELECT thought_id as "thoughtId"
                    FROM mehfil_reactions
                    WHERE user_id = $1 AND thought_id = ANY($2)`,
                    [data.userId, data.thoughtIds]
                );

                socket.emit('thoughts:user_reactions', result.rows.map(r => r.thoughtId));
            } catch (error) {
                console.error('Error getting user reactions:', error);
                socket.emit('thoughts:user_reactions', []);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Mehfil client disconnected:', socket.id);
        });
    });
}
