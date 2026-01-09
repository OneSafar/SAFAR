import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

async function createTestUser() {
    const email = 'debug@test.com';
    const password = 'password123';
    const name = 'Debug User';

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        console.log('✅ Test user already exists:', email);
        console.log('   Password:', password);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

    db.prepare(`
        INSERT INTO users (id, name, email, password_hash, avatar, exam_type, preparation_stage)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, email, hashedPassword, avatar, 'CGL', 'Beginner');

    // Initialize streaks
    db.prepare(`
        INSERT INTO streaks (id, user_id, login_streak, check_in_streak, goal_completion_streak, last_active_date)
        VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
    `).run(uuidv4(), userId);

    console.log('✅ Test user created successfully!');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   User ID:', userId);
}

createTestUser().then(() => {
    db.close();
    console.log('\n🎯 Use these credentials to test login:');
    console.log('   Email: debug@test.com');
    console.log('   Password: password123');
}).catch(err => {
    console.error('❌ Error:', err);
    db.close();
});
