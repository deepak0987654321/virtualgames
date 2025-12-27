import { getDB } from './db';

export async function initDB() {
    const db = await getDB();

    console.log('Validating database schema...');

    // USERS Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            avatar TEXT,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            totalScore INTEGER DEFAULT 0,
            deviceId TEXT,
            pinCode TEXT,
            lastOnline TEXT,
            isLoggedIn BOOLEAN DEFAULT 0,
            video_status BOOLEAN DEFAULT 0,
            audio_status BOOLEAN DEFAULT 0,
            hardware_available BOOLEAN DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Attempt migrations for Users (silently fail if columns exist)
    try { await db.exec("ALTER TABLE users ADD COLUMN deviceId TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN pinCode TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN lastOnline TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN isLoggedIn BOOLEAN DEFAULT 0;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN video_status BOOLEAN DEFAULT 0;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN audio_status BOOLEAN DEFAULT 0;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN hardware_available BOOLEAN DEFAULT 0;"); } catch (e) {}

    // LEADERBOARD Table (Unchanged)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            id TEXT PRIMARY KEY,
            userId TEXT,
            rank INTEGER,
            score INTEGER,
            company TEXT,
            product TEXT,
            team TEXT,
            gameType TEXT,
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id)
        );
    `);

    // ROOMS Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            roomId TEXT PRIMARY KEY,
            gameType TEXT,
            video_enabled BOOLEAN DEFAULT 0,
            audio_enabled BOOLEAN DEFAULT 0,
            required_mode TEXT DEFAULT 'none',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active'
        );
    `);

    // Attempt migrations for Rooms
    try { await db.exec("ALTER TABLE rooms ADD COLUMN video_enabled BOOLEAN DEFAULT 0;"); } catch (e) {}
    try { await db.exec("ALTER TABLE rooms ADD COLUMN audio_enabled BOOLEAN DEFAULT 0;"); } catch (e) {}
    try { await db.exec("ALTER TABLE rooms ADD COLUMN required_mode TEXT DEFAULT 'none';"); } catch (e) {}

    // TENANTS Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tenants (
            tenant_id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'public',
            branding TEXT,
            visibility TEXT DEFAULT 'public', -- 'public' or 'private'
            access_code TEXT,
            allowed_games TEXT DEFAULT '["rebus","draw","charades","categories"]', -- JSON string of game IDs
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // SESSIONS Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            avatar TEXT,
            session_expiry TEXT NOT NULL,
            last_online TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    // Multi-tenant Migrations
    try { await db.exec("ALTER TABLE users ADD COLUMN tenant_id TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'player';"); } catch (e) {}
    try { await db.exec("ALTER TABLE rooms ADD COLUMN tenant_id TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE rooms ADD COLUMN config TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE leaderboard ADD COLUMN tenant_id TEXT;"); } catch (e) {}

    // New Migrations for SuperAdmin Features
    try { await db.exec("ALTER TABLE tenants ADD COLUMN visibility TEXT DEFAULT 'public';"); } catch (e) {}
    try { await db.exec("ALTER TABLE tenants ADD COLUMN access_code TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE tenants ADD COLUMN allowed_games TEXT DEFAULT '[\"rebus\",\"draw\",\"charades\",\"categories\"]';"); } catch (e) {}

    // CATEGORIES GAME TABLES
    // Categories Game Sessions
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories_sessions (
            session_id TEXT PRIMARY KEY,
            room_code TEXT NOT NULL UNIQUE,
            host_id TEXT NOT NULL,
            total_rounds INTEGER NOT NULL,
            round_duration INTEGER NOT NULL,
            allowed_letters TEXT DEFAULT 'ABCDEFGHIJKLMNOPRSTUVW',
            current_round INTEGER DEFAULT 0,
            overall_time_left INTEGER,
            status TEXT DEFAULT 'waiting',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(host_id) REFERENCES users(id)
        );
    `);

    try { await db.exec("ALTER TABLE categories_sessions ADD COLUMN allowed_letters TEXT DEFAULT 'ABCDEFGHIJKLMNOPRSTUVW';"); } catch (e) {}
    try { await db.exec("ALTER TABLE categories_sessions ADD COLUMN overall_time_left INTEGER;"); } catch (e) {}

    // Categories Configuration
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories_config (
            config_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            category_name TEXT NOT NULL,
            category_order INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES categories_sessions(session_id)
        );
    `);

    // Round Data
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories_rounds (
            round_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            round_number INTEGER NOT NULL,
            letter TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            FOREIGN KEY(session_id) REFERENCES categories_sessions(session_id)
        );
    `);

    // Player Answers
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories_answers (
            answer_id TEXT PRIMARY KEY,
            round_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            category_name TEXT NOT NULL,
            answer TEXT,
            points_awarded INTEGER DEFAULT 0,
            is_unique BOOLEAN DEFAULT 0,
            submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(round_id) REFERENCES categories_rounds(round_id),
            FOREIGN KEY(player_id) REFERENCES users(id)
        );
    `);

    // Round Scores
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories_round_scores (
            score_id TEXT PRIMARY KEY,
            round_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            total_points INTEGER DEFAULT 0,
            is_winner BOOLEAN DEFAULT 0,
            FOREIGN KEY(round_id) REFERENCES categories_rounds(round_id),
            FOREIGN KEY(player_id) REFERENCES users(id)
        );
    `);

    console.log('Database initialized successfully.');
}
