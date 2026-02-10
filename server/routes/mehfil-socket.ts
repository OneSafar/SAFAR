import { Server, Socket } from 'socket.io';
import { db, pool } from '../db';
import { v4 as uuidv4 } from 'uuid';

export function setupMehfilSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('🔌 Mehfil client connected:', socket.id);

        // Load all topics
        socket.on('topic:load', async () => {
            try {
                const result = await db.execute(`
                    SELECT id, name, description, message_count 
                    FROM mehfil_topics 
                    ORDER BY created_at ASC
                `);
                socket.emit('topic:list', result.rows);
            } catch (error) {
                console.error('Error loading topics:', error);
                socket.emit('topic:list', []);
            }
        });

        // Load messages for a topic
        socket.on('topic:select', async (topicId: string) => {
            try {
                const result = await db.execute({
                    sql: `
                        SELECT id, topic_id as "topicId", author, text, image_url as "imageUrl", 
                               relatable_count as "relatableCount", flag_count as "flagCount", 
                               created_at as "createdAt", user_id as "userId"
                        FROM mehfil_messages 
                        WHERE topic_id = ?
                        ORDER BY created_at DESC
                        LIMIT 100
                    `,
                    args: [topicId]
                });
                socket.emit('topic:messages', result.rows);
            } catch (error) {
                console.error('Error loading messages:', error);
                socket.emit('topic:messages', []);
            }
        });

        // Create new message (now with user_id for contributor tracking)
        socket.on('message:create', async (data: { topicId: string; text: string; imageUrl?: string; sessionId: string; author?: string; userId?: string }) => {
            try {
                const messageId = uuidv4();
                const author = data.author || 'Anonymous';

                await db.execute({
                    sql: `INSERT INTO mehfil_messages (id, topic_id, author, text, image_url, relatable_count, flag_count, user_id)
                        VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
                    args: [messageId, data.topicId, author, data.text, data.imageUrl || null, data.userId || null]
                });

                // Update message count in topic
                await db.execute({
                    sql: `UPDATE mehfil_topics SET message_count = message_count + 1 WHERE id = ? `,
                    args: [data.topicId]
                });

                const newMessage = {
                    id: messageId,
                    topicId: data.topicId,
                    author,
                    text: data.text,
                    imageUrl: data.imageUrl,
                    relatableCount: 0,
                    flagCount: 0,
                    userId: data.userId || null,
                    createdAt: new Date().toISOString()
                };

                // Broadcast to all clients
                io.emit('message:new', newMessage);
            } catch (error) {
                console.error('Error creating message:', error);
            }
        });

        // Vote/React to a message
        socket.on('poll:vote', async (data: { messageId: string; sessionId: string; option: number }) => {
            try {
                const voteId = uuidv4();

                // Check if already voted
                const existing = await db.execute({
                    sql: `SELECT id FROM mehfil_votes WHERE message_id = ? AND session_id = ? `,
                    args: [data.messageId, data.sessionId]
                });

                if (existing.rows.length === 0) {
                    // Insert new vote
                    await db.execute({
                        sql: `INSERT INTO mehfil_votes(id, message_id, session_id, vote_option) VALUES(?, ?, ?, ?)`,
                        args: [voteId, data.messageId, data.sessionId, data.option]
                    });

                    // Update relatable count
                    await db.execute({
                        sql: `UPDATE mehfil_messages SET relatable_count = relatable_count + 1 WHERE id = ? `,
                        args: [data.messageId]
                    });

                    // Get updated count
                    const result = await db.execute({
                        sql: `SELECT relatable_count as "relatableCount" FROM mehfil_messages WHERE id = ? `,
                        args: [data.messageId]
                    });

                    const newCount = result.rows[0]?.relatableCount || 0;
                    io.emit('poll:updated', { messageId: data.messageId, relatableCount: newCount });
                }
            } catch (error) {
                console.error('Error processing vote:', error);
            }
        });

        // ── Community Events ──────────────────────────────────

        // Load all communities
        socket.on('community:load', async () => {
            try {
                const result = await pool.query(`
                    SELECT id, name, description, creator_id, member_count, created_at
                    FROM mehfil_communities
                    ORDER BY created_at DESC
                `);
                socket.emit('community:list', result.rows);
            } catch (error) {
                console.error('Error loading communities:', error);
                socket.emit('community:list', []);
            }
        });

        // Create a community
        socket.on('community:create', async (data: { name: string; description?: string; userId: string }) => {
            try {
                const communityId = uuidv4();

                await pool.query(
                    `INSERT INTO mehfil_communities (id, name, description, creator_id, member_count)
                     VALUES ($1, $2, $3, $4, 1)`,
                    [communityId, data.name, data.description || '', data.userId]
                );

                // Add creator as first member
                await pool.query(
                    `INSERT INTO mehfil_community_members (community_id, user_id) VALUES ($1, $2)`,
                    [communityId, data.userId]
                );

                const newCommunity = {
                    id: communityId,
                    name: data.name,
                    description: data.description || '',
                    creator_id: data.userId,
                    member_count: 1,
                    created_at: new Date().toISOString()
                };

                // Broadcast to all clients
                io.emit('community:new', newCommunity);
            } catch (error) {
                console.error('Error creating community:', error);
            }
        });

        // Join a community
        socket.on('community:join', async (data: { communityId: string; userId: string }) => {
            try {
                // Check if already a member
                const existing = await pool.query(
                    `SELECT 1 FROM mehfil_community_members WHERE community_id = $1 AND user_id = $2`,
                    [data.communityId, data.userId]
                );

                if (existing.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO mehfil_community_members (community_id, user_id) VALUES ($1, $2)`,
                        [data.communityId, data.userId]
                    );
                    await pool.query(
                        `UPDATE mehfil_communities SET member_count = member_count + 1 WHERE id = $1`,
                        [data.communityId]
                    );
                    io.emit('community:updated', { communityId: data.communityId, action: 'joined' });
                }
            } catch (error) {
                console.error('Error joining community:', error);
            }
        });

        // ── Top Contributors ──────────────────────────────────

        // Get top contributors (users who posted the most messages)
        socket.on('contributors:top', async () => {
            try {
                const result = await pool.query(`
                    SELECT 
                        u.id, u.name, u.avatar,
                        COUNT(m.id) as post_count
                    FROM users u
                    INNER JOIN mehfil_messages m ON m.user_id = u.id
                    GROUP BY u.id, u.name, u.avatar
                    ORDER BY post_count DESC
                    LIMIT 5
                `);
                socket.emit('contributors:list', result.rows);
            } catch (error) {
                console.error('Error loading top contributors:', error);
                socket.emit('contributors:list', []);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Mehfil client disconnected:', socket.id);
        });
    });
}
