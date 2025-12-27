import type { NextApiRequest, NextApiResponse } from 'next';
import { getDB } from '../../../database/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'User ID required' });

    try {
        const db = await getDB();
        // Delete user from users table
        await db.run('DELETE FROM users WHERE id = ?', id);
        // Also clean up leaderboard entries for this user
        await db.run('DELETE FROM leaderboard WHERE userId = ?', id);

        console.log(`[Admin] Deleted user ${id}`);
        res.status(200).json({ success: true });
    } catch (e) {
        console.error("[Admin] Delete failed:", e);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}
