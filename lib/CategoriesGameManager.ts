import { getDB } from '../database/db';

const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVW'; // Exclude difficult letters

export interface CategoriesConfig {
    categories: string[];
    totalRounds: number;
    roundDuration: number; // in seconds
    allowedLetters?: string;
}

export interface CategoriesGameState {
    sessionId: string;
    roomCode: string;
    hostId: string;
    categories: string[];
    totalRounds: number;
    roundDuration: number;
    allowedLetters: string;
    currentRound: number;
    currentLetter: string | null;
    roundStartTime: number | null;
    overallTimeLeft: number; // in seconds
    isGlobalTimerPaused: boolean;
    status: 'waiting' | 'active' | 'reviewing' | 'finished';
    timerId?: NodeJS.Timeout;
    globalTimerId?: NodeJS.Timeout;
}

export interface PlayerAnswer {
    playerId: string;
    category: string;
    answer: string;
}

export interface RoundScore {
    playerId: string;
    username: string;
    avatar: string;
    categoryScores: Map<string, number>;
    totalPoints: number;
}

export class CategoriesGameManager {
    private sessions: Map<string, CategoriesGameState> = new Map();

    /**
     * Create a new Categories game session
     */
    async createSession(roomCode: string, hostId: string, config: CategoriesConfig): Promise<string> {
        const db = await getDB();
        const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Validate config
        if (config.categories.length < 1 || config.categories.length > 8) {
            throw new Error('Categories must be between 1 and 8');
        }

        // Create session in database
        await db.run(
            `INSERT OR REPLACE INTO categories_sessions (session_id, room_code, host_id, total_rounds, round_duration, allowed_letters, overall_time_left, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')`,
            [sessionId, roomCode, hostId, config.totalRounds, config.roundDuration, config.allowedLetters || AVAILABLE_LETTERS, Math.max(1, config.totalRounds) * config.roundDuration, 'waiting']
        );

        // Store categories configuration
        for (let i = 0; i < config.categories.length; i++) {
            const configId = `${sessionId}_cat_${i}`;
            await db.run(
                `INSERT INTO categories_config (config_id, session_id, category_name, category_order)
                 VALUES (?, ?, ?, ?)`,
                [configId, sessionId, config.categories[i], i]
            );
        }

        // Initialize in-memory state
        this.sessions.set(sessionId, {
            sessionId,
            roomCode,
            hostId,
            categories: config.categories,
            totalRounds: config.totalRounds,
            roundDuration: config.roundDuration,
            allowedLetters: config.allowedLetters || AVAILABLE_LETTERS,
            currentRound: 0,
            currentLetter: null,
            roundStartTime: null,
            overallTimeLeft: Math.max(1, config.totalRounds) * config.roundDuration, // Initial duration based on rounds
            isGlobalTimerPaused: true,
            status: 'waiting'
        });

        return sessionId;
    }

    /**
     * Update session configuration (Allows "Anyone" to change cats)
     */
    async updateConfig(sessionId: string, config: CategoriesConfig): Promise<void> {
        const db = await getDB();
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');
        if (session.status !== 'waiting') throw new Error('Cannot change config after start');

        session.categories = config.categories;
        session.totalRounds = config.totalRounds;
        session.roundDuration = config.roundDuration;
        session.allowedLetters = config.allowedLetters || AVAILABLE_LETTERS;

        await db.run(
            `UPDATE categories_sessions SET total_rounds = ?, round_duration = ?, allowed_letters = ? WHERE session_id = ?`,
            [config.totalRounds, config.roundDuration, session.allowedLetters, sessionId]
        );

        // Update DB
        await db.run(
            `UPDATE categories_sessions SET total_rounds = ?, round_duration = ? WHERE session_id = ?`,
            [config.totalRounds, config.roundDuration, sessionId]
        );

        await db.run(`DELETE FROM categories_config WHERE session_id = ?`, [sessionId]);
        for (let i = 0; i < config.categories.length; i++) {
            const configId = `${sessionId}_cat_${i}_upd_${Date.now()}`;
            await db.run(
                `INSERT INTO categories_config (config_id, session_id, category_name, category_order)
                 VALUES (?, ?, ?, ?)`,
                [configId, sessionId, config.categories[i], i]
            );
        }
    }

    /**
     * Get session state
     */
    async getSession(sessionId: string): Promise<CategoriesGameState | undefined> {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = await this.loadSessionFromDB(sessionId);
            if (session) this.sessions.set(sessionId, session);
        }
        return session;
    }

    async getSessionByRoomCode(roomCode: string): Promise<CategoriesGameState | undefined> {
        // Check memory first
        for (const session of this.sessions.values()) {
            if (session.roomCode === roomCode) return session;
        }

        // Check DB
        const db = await getDB();
        const row = await db.get(`SELECT session_id FROM categories_sessions WHERE room_code = ?`, [roomCode]);
        if (row) {
             const session = await this.loadSessionFromDB(row.session_id);
             if (session) {
                 this.sessions.set(session.sessionId, session);
                 return session;
             }
        }
        return undefined;
    }

    private async loadSessionFromDB(sessionId: string): Promise<CategoriesGameState | undefined> {
        const db = await getDB();
        const sessionRow = await db.get(`SELECT * FROM categories_sessions WHERE session_id = ?`, [sessionId]);
        if (!sessionRow) return undefined;

        const configRows = await db.all(
            `SELECT category_name FROM categories_config WHERE session_id = ? ORDER BY category_order`,
            [sessionId]
        );
        const categories = configRows.map(r => r.category_name);

        let currentLetter = null;
        let roundStartTime = null;
        if (sessionRow.status === 'active' || sessionRow.status === 'reviewing') {
            const roundRow = await db.get(
                `SELECT letter, started_at FROM categories_rounds WHERE session_id = ? AND round_number = ?`,
                [sessionId, sessionRow.current_round]
            );
            if (roundRow) {
                currentLetter = roundRow.letter;
                roundStartTime = new Date(roundRow.started_at).getTime();
            }
        }

        return {
            sessionId: sessionRow.session_id,
            roomCode: sessionRow.room_code,
            hostId: sessionRow.host_id,
            categories,
            totalRounds: sessionRow.total_rounds,
            roundDuration: sessionRow.round_duration,
            allowedLetters: sessionRow.allowed_letters || AVAILABLE_LETTERS,
            currentRound: sessionRow.current_round,
            currentLetter,
            roundStartTime,
            overallTimeLeft: sessionRow.overall_time_left !== null ? sessionRow.overall_time_left : (sessionRow.total_rounds * sessionRow.round_duration),
            isGlobalTimerPaused: sessionRow.status !== 'active',
            status: sessionRow.status as any
        };
    }

    /**
     * Start a new round
     */
    async startRound(sessionId: string): Promise<{ letter: string; roundNumber: number }> {
        const db = await getDB();
        const session = await this.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.currentRound >= session.totalRounds || session.overallTimeLeft <= 0) {
            throw new Error('Game completed');
        }

        // Increment round
        session.currentRound++;
        session.currentLetter = this.getRandomLetterFrom(session.allowedLetters);
        session.roundStartTime = Date.now();
        session.status = 'active';
        session.isGlobalTimerPaused = false; // RESUME TIMER

        // Update database
        await db.run(
            `UPDATE categories_sessions SET current_round = ?, status = 'active' WHERE session_id = ?`,
            [session.currentRound, sessionId]
        );

        // Create round record
        const roundId = `${sessionId}_r${session.currentRound}`;
        await db.run(
            `INSERT INTO categories_rounds (round_id, session_id, round_number, letter, started_at)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [roundId, sessionId, session.currentRound, session.currentLetter]
        );

        return {
            letter: session.currentLetter,
            roundNumber: session.currentRound
        };
    }

    /**
     * Submit a player's answer for a category
     */
    async submitAnswer(sessionId: string, playerId: string, category: string, answer: string): Promise<void> {
        const db = await getDB();
        const session = await this.getSession(sessionId);

        if (!session) throw new Error('Session not found');
        if (session.status !== 'active') throw new Error('Round not active');

        const trimmedAnswer = answer.trim();
        const roundId = `${sessionId}_r${session.currentRound}`;
        const answerId = `${roundId}_${playerId}_${category}`;

        // Add columns for voting if they don't exist
        try { await db.exec("ALTER TABLE categories_answers ADD COLUMN valid_votes INTEGER DEFAULT 0;"); } catch(e){}
        try { await db.exec("ALTER TABLE categories_answers ADD COLUMN invalid_votes INTEGER DEFAULT 0;"); } catch(e){}
        try { await db.exec("ALTER TABLE categories_answers ADD COLUMN shared_votes INTEGER DEFAULT 0;"); } catch(e){}

        await db.run(
            `INSERT OR REPLACE INTO categories_answers (answer_id, round_id, player_id, category_name, answer)
             VALUES (?, ?, ?, ?, ?)`,
            [answerId, roundId, playerId, category, trimmedAnswer]
        );
    }

    /**
     * Terminate the answer phase (STOP! button)
     */
    async endAnswerPhase(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session || session.status !== 'active') return;

        session.status = 'reviewing';
        session.isGlobalTimerPaused = true; // PAUSE GLOBAL TIMER DURING REVIEW
        const db = await getDB();
        await db.run(`UPDATE categories_sessions SET status = 'reviewing' WHERE session_id = ?`, [sessionId]);
    }

    /**
     * Handle Manual Validation/Voting
     */
    async voteAnswer(sessionId: string, roundNumber: number, playerId: string, category: string, voteType: 'valid' | 'invalid' | 'shared'): Promise<void> {
        const db = await getDB();
        const roundId = `${sessionId}_r${roundNumber}`;
        const answerId = `${roundId}_${playerId}_${category}`;

        if (voteType === 'valid') {
            await db.run(`UPDATE categories_answers SET valid_votes = valid_votes + 1 WHERE answer_id = ?`, [answerId]);
        } else if (voteType === 'invalid') {
            await db.run(`UPDATE categories_answers SET invalid_votes = invalid_votes + 1 WHERE answer_id = ?`, [answerId]);
        } else if (voteType === 'shared') {
            await db.run(`UPDATE categories_answers SET shared_votes = shared_votes + 1 WHERE answer_id = ?`, [answerId]);
        }
    }

    /**
     * End the current round and calculate final scores
     */
    async finalizeRound(sessionId: string): Promise<RoundScore[]> {
        const db = await getDB();
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        const roundId = `${sessionId}_r${session.currentRound}`;

        // Mark round as ended
        await db.run(`UPDATE categories_rounds SET ended_at = datetime('now') WHERE round_id = ?`, [roundId]);

        // Calculate scores
        const scores = await this.calculateScores(roundId, session.categories, session.currentLetter!);

        // Store round scores
        for (const score of scores) {
            const scoreId = `${roundId}_${score.playerId}`;
            const maxPoints = Math.max(...scores.map(s => s.totalPoints));
            const isWinner = score.totalPoints === maxPoints && maxPoints > 0;
            await db.run(
                `INSERT INTO categories_round_scores (score_id, round_id, player_id, total_points, is_winner)
                 VALUES (?, ?, ?, ?, ?)`,
                [scoreId, roundId, score.playerId, score.totalPoints, isWinner ? 1 : 0]
            );
        }

        // Update session status
        // Game ends if ALL rounds completed OR timer reached 0
        console.log(`[Categories] Finalizing Round ${session.currentRound}/${session.totalRounds}. Time left: ${session.overallTimeLeft}`);

        if (session.currentRound >= session.totalRounds || session.overallTimeLeft <= 0) {
            console.log(`[Categories] Game Finished for session ${sessionId}`);
            session.status = 'finished';
            await db.run(`UPDATE categories_sessions SET status = 'finished', overall_time_left = ? WHERE session_id = ?`, [session.overallTimeLeft, sessionId]);
        } else {
            session.status = 'waiting';
            await db.run(`UPDATE categories_sessions SET status = 'waiting', overall_time_left = ? WHERE session_id = ?`, [session.overallTimeLeft, sessionId]);
        }

        return scores;
    }

    /**
     * Ticks the global timer and returns new value
     */
    async tickGlobalTimer(sessionId: string): Promise<number> {
        const session = await this.getSession(sessionId);
        if (!session || session.status === 'finished') return -1;

        if (!session.isGlobalTimerPaused && session.overallTimeLeft > 0) {
            session.overallTimeLeft--;
        }

        return session.overallTimeLeft;
    }

    /**
     * Calculate scores for a round
     * 10 points for unique valid answers
     * 5 points for duplicate valid answers
     * 0 points for invalid answers
     */
    private async calculateScores(roundId: string, categories: string[], letter: string): Promise<RoundScore[]> {
        const db = await getDB();

        const answers = await db.all(
            `SELECT a.answer_id, a.player_id, a.category_name, a.answer, a.valid_votes, a.invalid_votes, a.shared_votes,
                    COALESCE(u.username, 'Player') as username,
                    COALESCE(u.avatar, '') as avatar
             FROM categories_answers a
             LEFT JOIN users u ON a.player_id = u.id
             WHERE a.round_id = ?`,
            [roundId]
        );

        console.log(`[Categories] Calculating scores for Round ${roundId}. Found ${answers.length} answers. Letter: ${letter}`);

        const players = new Map<string, { username: string; avatar: string }>();
        for (const answer of answers) {
            if (!players.has(answer.player_id)) {
                players.set(answer.player_id, { username: answer.username, avatar: answer.avatar });
            }
        }

        const scores: RoundScore[] = [];

        for (const [playerId, playerInfo] of players) {
            const categoryScores = new Map<string, number>();
            let totalPoints = 0;

            for (const category of categories) {
                const playerAnswer = answers.find(a => a.player_id === playerId && a.category_name === category);

                if (!playerAnswer || !playerAnswer.answer || playerAnswer.answer.trim() === '') {
                    categoryScores.set(category, 0);
                    continue;
                }

                const ansText = playerAnswer.answer.trim();
                const normalizedAnswer = ansText.toLowerCase();

                // VALIDATION LOGIC
                // 1. Must start with letter
                const startsWithLetter = ansText[0]?.toUpperCase() === letter.toUpperCase();

                // 2. Voting result
                const isVotedInvalid = playerAnswer.invalid_votes > playerAnswer.valid_votes;

                if (!startsWithLetter || isVotedInvalid) {
                    console.log(`[Categories] Invalid Answer: ${ansText} (Starts with letter: ${startsWithLetter}, Voted Invalid: ${isVotedInvalid})`);
                    categoryScores.set(category, 0);
                    await db.run(`UPDATE categories_answers SET points_awarded = 0, is_unique = 0 WHERE answer_id = ?`, [playerAnswer.answer_id]);
                    continue;
                }

                // Count duplicates among VALID answers
                const duplicates = answers.filter(a =>
                    a.category_name === category &&
                    a.answer?.toLowerCase().trim() === normalizedAnswer &&
                    (a.answer[0]?.toUpperCase() === letter.toUpperCase()) &&
                    (a.invalid_votes <= a.valid_votes)
                ).length;

                // Manual "shared" status if anyone voted it as shared
                const hasSharedVotes = (playerAnswer.shared_votes || 0) > 0;

                // Calculate points: 10 if unique, 5 if duplicate or shared
                let points = 10;
                if (duplicates > 1 || hasSharedVotes) {
                    points = 5;
                }

                categoryScores.set(category, points);
                totalPoints += points;

                await db.run(
                    `UPDATE categories_answers SET points_awarded = ?, is_unique = ? WHERE answer_id = ?`,
                    [points, points === 10 ? 1 : 0, playerAnswer.answer_id]
                );
            }

            scores.push({
                playerId,
                username: playerInfo.username,
                avatar: playerInfo.avatar,
                categoryScores,
                totalPoints
            });
        }

        return scores.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    async getLeaderboard(sessionId: string): Promise<any[]> {
        const db = await getDB();
        const leaderboard = await db.all(
            `SELECT COALESCE(u.id, rs.player_id) as playerId,
                    COALESCE(u.username, 'Player') as username,
                    COALESCE(u.avatar, '') as avatar,
                    SUM(rs.total_points) as totalScore
             FROM categories_round_scores rs
             LEFT JOIN users u ON rs.player_id = u.id
             JOIN categories_rounds r ON rs.round_id = r.round_id
             WHERE r.session_id = ?
             GROUP BY rs.player_id
             ORDER BY totalScore DESC`,
            [sessionId]
        );
        return leaderboard;
    }

    async getRoundAnswers(sessionId: string, roundNumber: number): Promise<any[]> {
        const db = await getDB();
        const roundId = `${sessionId}_r${roundNumber}`;
        return await db.all(
            `SELECT a.player_id,
                    COALESCE(u.username, 'Player') as username,
                    COALESCE(u.avatar, '') as avatar,
                    a.category_name, a.answer, a.points_awarded, a.is_unique, a.valid_votes, a.invalid_votes
             FROM categories_answers a
             LEFT JOIN users u ON a.player_id = u.id
             WHERE a.round_id = ?
             ORDER BY a.category_name, username`,
            [roundId]
        );
    }

    private getRandomLetterFrom(allowed: string): string {
        const letters = allowed || AVAILABLE_LETTERS;
        return letters[Math.floor(Math.random() * letters.length)];
    }

    async getHostName(hostId: string): Promise<string | null> {
        const db = await getDB();
        const row = await db.get('SELECT username FROM users WHERE id = ?', [hostId]);
        return row ? row.username : null;
    }

    setTimer(sessionId: string, timer: NodeJS.Timeout, type: 'round' | 'global' = 'round') {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (type === 'round') {
                if (session.timerId) clearTimeout(session.timerId);
                session.timerId = timer;
            } else {
                if (session.globalTimerId) clearInterval(session.globalTimerId as any);
                session.globalTimerId = timer;
            }
        }
    }

    getTimer(sessionId: string, type: 'round' | 'global' = 'round'): NodeJS.Timeout | undefined {
        const session = this.sessions.get(sessionId);
        return type === 'round' ? session?.timerId : session?.globalTimerId;
    }

    clearTimer(sessionId: string, type: 'round' | 'global' = 'round') {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (type === 'round' && session.timerId) {
                clearTimeout(session.timerId);
                session.timerId = undefined;
            } else if (type === 'global' && session.globalTimerId) {
                clearInterval(session.globalTimerId as any);
                session.globalTimerId = undefined;
            }
        }
    }
}

export const categoriesGameManager = new CategoriesGameManager();
