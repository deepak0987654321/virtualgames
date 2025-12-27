import { getDB } from './db';

async function migrate() {
    console.log('Starting Migration: Remove Unique Username Constraint...');
    const db = await getDB();

    try {
        await db.exec('BEGIN TRANSACTION;');

        // 1. Rename old table
        console.log('Renaming old table...');
        await db.exec('ALTER TABLE users RENAME TO users_old;');

        // 2. Create new table (All columns included)
        console.log('Creating new table...');
        await db.exec(`
            CREATE TABLE users (
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
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                tenant_id TEXT,
                role TEXT DEFAULT 'player'
            );
        `);

        // 3. Copy data
        console.log('Copying data...');
        // We select matching columns. If some defaults were added via ALTER in init.ts, they exist in users_old now.
        // We just need to make sure we map them correctly.
        // The columns in users_old should match:
        await db.exec(`
            INSERT INTO users (
                id, username, avatar, wins, losses, totalScore, deviceId, pinCode,
                lastOnline, isLoggedIn, video_status, audio_status, hardware_available,
                createdAt, tenant_id, role
            )
            SELECT
                id, username, avatar, wins, losses, totalScore, deviceId, pinCode,
                lastOnline, isLoggedIn, video_status, audio_status, hardware_available,
                createdAt, tenant_id, role
            FROM users_old;
        `);

        // 4. Drop old table
        console.log('Dropping old table...');
        await db.exec('DROP TABLE users_old;');

        await db.exec('COMMIT;');
        console.log('Migration Successful!');
    } catch (e) {
        console.error('Migration Failed:', e);
        await db.exec('ROLLBACK;');
        process.exit(1);
    }
}

migrate();
