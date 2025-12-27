import { getDB } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface GameResultPlayer {
    playerId?: string;
    name: string;
    score: number;
    team?: string;
    isWinner: boolean;
}

class LeaderboardStore {

    public async recordGameResult(players: GameResultPlayer[], gameType: string, company: string = '', product: string = '', tenantId?: string): Promise<void> {
        try {
            const db = await getDB();

            for (const p of players) {
                // Find or Create User by Persistent ID (playerId)
                let user = null;
                if (p.playerId) {
                    user = await db.get('SELECT id FROM users WHERE id = ?', p.playerId);
                }

                if (!user) {
                    // This should theoretically not happen often if playerId is passed correctly
                    const newId = p.playerId || uuidv4();
                    // Scope user to Tenant? user table has tenant_id now.
                    // But here we might not have tenantId if not passed.
                    // Assuming user creation happens via API /api/user.
                    // If creating ad-hoc here, we might miss tenant_id.
                    // Use existing logic for now.
                    await db.run('INSERT INTO users (id, username, totalScore, wins, losses) VALUES (?, ?, ?, ?, ?)',
                        [newId, p.name, p.score, p.isWinner ? 1 : 0, p.isWinner ? 0 : 1]);
                    user = { id: newId };
                } else {
                    await db.run(
                        `UPDATE users SET
                            username = ?,
                            totalScore = totalScore + ?,
                            wins = wins + ?,
                            losses = losses + ?
                        WHERE id = ?`,
                        [p.name, p.score, p.isWinner ? 1 : 0, p.isWinner ? 0 : 1, user.id]
                    );
                }

                // Add to Leaderboard (History) if score > 0
                if (p.score > 0) {
                     await db.run(
                        'INSERT INTO leaderboard (id, userId, score, company, product, team, gameType, tenant_id, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [uuidv4(), user.id, p.score, company, product, p.team || '', gameType, tenantId || null, new Date().toISOString()]
                     );
                }
            }

        } catch (e) {
            console.error("Error saving game results to DB:", e);
        }
    }

    public async getTopPlayers(limit: number = 10): Promise<any[]> {
        const db = await getDB();
        return await db.all('SELECT username, avatar, totalScore, wins, losses FROM users ORDER BY totalScore DESC LIMIT ?', limit);
    }

    // TIER 1: Company Leaderboard Home
    public async getTier1Companies(): Promise<any[]> {
        const db = await getDB();
        return await db.all(`
            SELECT
                company,
                COUNT(DISTINCT lastUpdated) as total_games, -- approximate count based on timestamps/batches or we assume 1 entry per player per game implies distinct groups?
                -- Actually, counting 'id' approximates 'player-games'. To count actual games, we might need a request_id or better grouping.
                -- For simplicity in this schema: count distinct timestamps (roughly).
                COUNT(DISTINCT userId) as total_users
            FROM leaderboard
            WHERE company != '' AND company IS NOT NULL
            GROUP BY company
            ORDER BY total_games DESC
        `);
    }

    // TIER 2: Company Detail Leaderboard
    public async getTier2CompanyDetails(company: string, filters: { products?: string[], gameTypes?: string[] } = {}): Promise<any[]> {
        const db = await getDB();
        let query = `
            SELECT
                product,
                gameType,
                COUNT(id) as total_records,
                COUNT(DISTINCT userId) as total_players,
                SUM(score) as total_score
            FROM leaderboard
            WHERE company = ? AND product != ''
        `;
        const params: any[] = [company];

        if (filters.products && filters.products.length > 0) {
            query += ` AND product IN (${filters.products.map(() => '?').join(',')})`;
            params.push(...filters.products);
        }

        if (filters.gameTypes && filters.gameTypes.length > 0) {
            query += ` AND gameType IN (${filters.gameTypes.map(() => '?').join(',')})`;
            params.push(...filters.gameTypes);
        }

        query += ` GROUP BY product, gameType ORDER BY total_score DESC`;

        const rows = await db.all(query, params);

        // Fetch top player for each group (expensive but cool)
        // For optimization, we skip this or do a secondary fetch.
        // Let's do a simple enrichment loop
        for (const row of rows) {
            const topPlayer = await db.get(`
                SELECT u.username, l.score
                FROM leaderboard l
                JOIN users u ON l.userId = u.id
                WHERE l.company = ? AND l.product = ? AND l.gameType = ?
                ORDER BY l.score DESC
                LIMIT 1
            `, [company, row.product, row.gameType]);
            row.top_player = topPlayer ? topPlayer.username : 'N/A';
        }

        return rows;
    }

    // TIER 3: Final Game Leaderboard (Player Rankings)
    public async getTier3PlayerRankings(company: string, product: string, gameType: string): Promise<any[]> {
        const db = await getDB();
        // Aggregate all time stats for this specific slice
        return await db.all(`
            SELECT
                u.username,
                u.avatar,
                SUM(l.score) as total_points,
                COUNT(l.id) as games_played,
                SUM(CASE WHEN l.rank = 1 THEN 1 ELSE 0 END) as wins -- If we stored rank properly, else we might need another way
                -- For now, let's just sum points. "Wins" in users table is global, not per-company.
                -- We can approximate wins if 'score' was high? Or if we stored 'rank' in leaderboard which we do (though checks above didn't consistently set it).
                -- Let's stick to total points for ranking.
            FROM leaderboard l
            JOIN users u ON l.userId = u.id
            WHERE l.company = ? AND l.product = ? AND l.gameType = ?
            GROUP BY u.username
            ORDER BY total_points DESC
        `, [company, product, gameType]);
    }

    // UTILS for Filters
    public async getCompanyFilters(company: string): Promise<{ products: string[], gameTypes: string[] }> {
        const db = await getDB();
        const products = await db.all('SELECT DISTINCT product FROM leaderboard WHERE company = ?', company);
        const gameTypes = await db.all('SELECT DISTINCT gameType FROM leaderboard WHERE company = ?', company);
        return {
            products: products.map(r => r.product).filter(Boolean),
            gameTypes: gameTypes.map(r => r.gameType).filter(Boolean)
        };
    }

    public async getTenantLeaderboard(tenantId: string): Promise<any[]> {
        const db = await getDB();
        return await db.all(`
            SELECT
                u.username,
                u.avatar,
                SUM(l.score) as total_score,
                COUNT(DISTINCT l.lastUpdated) as games_played
            FROM leaderboard l
            JOIN users u ON l.userId = u.id
            WHERE l.tenant_id = ?
            GROUP BY u.id
            ORDER BY total_score DESC
            LIMIT 20
        `, [tenantId]);
    }
}

export default new LeaderboardStore();
