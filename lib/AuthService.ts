import { getDB } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
    session_token: string;
    user_id: string;
    username: string;
    avatar: string;
    session_expiry: string;
    last_online: string;
    wins?: number;
    losses?: number;
    totalScore?: number;
    role?: 'admin' | 'player' | 'superadmin';
    tenant_id?: string;
}

export class AuthService {
    static async createSession(userId: string, username: string, avatar: string): Promise<Session> {
        const db = await getDB();
        const sessionToken = uuidv4();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days session
        const session_expiry = expiryDate.toISOString();

        await db.run(
            `INSERT INTO sessions (session_token, user_id, username, avatar, session_expiry)
             VALUES (?, ?, ?, ?, ?)`,
            [sessionToken, userId, username, avatar, session_expiry]
        );

        // Update user status
        await db.run('UPDATE users SET lastOnline = CURRENT_TIMESTAMP, isLoggedIn = 1 WHERE id = ?', [userId]);

        // Fetch current stats & role
        const user = await db.get('SELECT role, tenant_id, wins, losses, totalScore FROM users WHERE id = ?', [userId]);

        return {
            session_token: sessionToken,
            user_id: userId,
            username,
            avatar,
            session_expiry,
            last_online: new Date().toISOString(),
            wins: user?.wins || 0,
            losses: user?.losses || 0,
            totalScore: user?.totalScore || 0,
            role: user?.role || 'player',
            tenant_id: user?.tenant_id
        };
    }

    static async validateSession(token: string): Promise<Session | null> {
        const db = await getDB();
        const session = await db.get('SELECT * FROM sessions WHERE session_token = ?', token);

        if (!session) return null;

        const expiry = new Date(session.session_expiry);
        if (expiry < new Date()) {
            await this.logout(token);
            return null;
        }

        // Update last online in both tables
        const now = new Date().toISOString();
        await db.run('UPDATE sessions SET last_online = ? WHERE session_token = ?', [now, token]);
        await db.run('UPDATE users SET lastOnline = ? WHERE id = ?', [now, session.user_id]);

        // Join with users for stats & LATEST role
        const userStats = await db.get('SELECT role, tenant_id, wins, losses, totalScore FROM users WHERE id = ?', [session.user_id]);

        return {
            ...session,
            ...userStats
        };
    }

    static async logout(token: string): Promise<void> {
        const db = await getDB();
        const session = await db.get('SELECT user_id FROM sessions WHERE session_token = ?', token);
        if (session) {
            await db.run('UPDATE users SET isLoggedIn = 0 WHERE id = ?', [session.user_id]);
        }
        await db.run('DELETE FROM sessions WHERE session_token = ?', token);
    }
}
