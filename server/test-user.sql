-- Create test user with known credentials
-- Email: debug@test.com
-- Password: password123
-- The password hash below is bcrypt hash of 'password123'

INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, exam_type, preparation_stage, created_at)
VALUES (
    'debug-user-001',
    'Debug User',
    'debug@test.com',
    '$2b$10$rQ5YqLZx5fZx5fZx5fZx5eZx5fZx5fZx5fZx5fZx5fZx5fZx5fZx5',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=debug@test.com',
    'CGL',
    'Beginner',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO streaks (id, user_id, login_streak, check_in_streak, goal_completion_streak, last_active_date)
VALUES (
    'debug-streak-001',
    'debug-user-001',
    0,
    0,
    0,
    CURRENT_TIMESTAMP
);
