import { Server, Socket } from 'socket.io';
import { db } from '../db';
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
                        SELECT id, topic_id as topicId, author, text, image_url as imageUrl, 
                               relatable_count as relatableCount, flag_count as flagCount, 
                               created_at as createdAt
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

        // Create new message
        socket.on('message:create', async (data: { topicId: string; text: string; imageUrl?: string; sessionId: string; author?: string }) => {
            try {
                const messageId = uuidv4();
                const author = data.author || 'Anonymous';

                await db.execute({
                    sql: `INSERT INTO mehfil_messages (id, topic_id, author, text, image_url, relatable_count, flag_count)
                        VALUES (?, ?, ?, ?, ?, 0, 0)`,
                    args: [messageId, data.topicId, author, data.text, data.imageUrl || null]
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
                        sql: `SELECT relatable_count as relatableCount FROM mehfil_messages WHERE id = ? `,
                        args: [data.messageId]
                    });

                    const newCount = result.rows[0]?.relatableCount || 0;
                    io.emit('poll:updated', { messageId: data.messageId, relatableCount: newCount });
                }
            } catch (error) {
                console.error('Error processing vote:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Mehfil client disconnected:', socket.id);
        });
    });
}
