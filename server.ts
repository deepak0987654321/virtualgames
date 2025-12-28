import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import GameManager from './lib/GameManager';
import leaderboardStore from './lib/LeaderboardStore';
import { initDB } from './database/init';
import { getDB } from './database/db';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './lib/AuthService';
import { categoriesGameManager } from './lib/CategoriesGameManager';
import { tenantManager } from './lib/TenantManager';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    // 1. Initialize Database
    try {
        await initDB();
    } catch (e) {
        console.error("Database init failed:", e);
    }

    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);
    const gameManager = new GameManager(io);

    server.use(express.json());

    // 2. API Routes

    server.get('/api/health', (req, res) => {
        res.json({ status: 'active', platform: 'VirtualGames' });
    });

    server.get('/api/leaderboard', async (req, res) => {
        try {
            const { view, company, product, gameType, products, gameTypes } = req.query;

            // Tier 1: Companies List
            if (view === 'companies') {
                const rows = await leaderboardStore.getTier1Companies();
                res.json(rows);
            }
            // Tier 2: Company Details with Filter
            else if (view === 'company_detail' && typeof company === 'string') {
                const productFilter = Array.isArray(products) ? products as string[] : (typeof products === 'string' ? [products] : undefined);
                const typeFilter = Array.isArray(gameTypes) ? gameTypes as string[] : (typeof gameTypes === 'string' ? [gameTypes] : undefined);

                const rows = await leaderboardStore.getTier2CompanyDetails(company, { products: productFilter, gameTypes: typeFilter });
                res.json(rows);
            }
            // Tier 3: Player Rankings
            else if (view === 'player_rankings' && typeof company === 'string' && typeof product === 'string' && typeof gameType === 'string') {
                const rows = await leaderboardStore.getTier3PlayerRankings(company, product, gameType);
                res.json(rows);
            }
            // Filters Helper
            else if (view === 'filters' && typeof company === 'string') {
                const filters = await leaderboardStore.getCompanyFilters(company);
                res.json(filters);
            }
            // Fallback: Global Top Players (Legacy)
            else {
                const rows = await leaderboardStore.getTopPlayers(20);
                res.json(rows);
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    server.get('/api/profiles', async (req, res) => {
        const { deviceId } = req.query;
        console.log(`[API] /api/profiles requested for deviceId: ${deviceId}`);
        if (!deviceId) return res.status(400).json({ error: 'Device ID required' });
        try {
            const db = await getDB();
            const profiles = await db.all('SELECT id, username, avatar, wins, losses, totalScore FROM users WHERE deviceId = ?', [deviceId]);
            console.log(`[API] Found ${profiles.length} profiles for deviceId: ${deviceId}`);
            res.json(profiles);
        } catch (e) {
            console.error('[API] /api/profiles error:', e);
            res.status(500).json({ error: 'Failed to fetch profiles' });
        }
    });

    // Tenant Management Route
    server.get('/api/tenant/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            const result = await tenantManager.ensureTenant(slug);
            res.json(result); // This includes tenant.allowed_games due to TenantManager changes
        } catch (e) {
            console.error("Tensor Error:", e);
            res.status(500).json({ error: 'Failed to resolve tenant' });
        }
    });

    server.get('/api/tenant/:slug/leaderboard', async (req, res) => {
        try {
            const { slug } = req.params;
            const tenant = await tenantManager.getTenant(slug);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

            const leaderboard = await leaderboardStore.getTenantLeaderboard(tenant.tenant_id);
            res.json(leaderboard);
        } catch (e) {
             console.error('Leaderboard Fetch Error:', e);
             res.status(500).json({ error: 'Failed' });
        }
    });

    // --- TENANT PUBLIC API ---

    server.get('/api/tenant/:slug/users/public', async (req, res) => {
        try {
            const { slug } = req.params;
            const tenant = await tenantManager.getTenant(slug);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

            // Re-use logic for users but filter sensitive fields AND deviceId if provided
            const deviceId = req.query.deviceId as string;
            const users = await tenantManager.getTenantUsers(tenant.tenant_id);

            const filteredUsers = users
                .filter(u => !deviceId || u.deviceId === deviceId) // Only show my profiles if deviceId sent
                .map(u => ({
                    id: u.id,
                    username: u.username,
                    avatar: u.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${u.username}`,
                    role: u.role
                }));

            res.json({ users: filteredUsers });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch public users' });
        }
    });

    server.post('/api/tenant/:slug/verify-access', async (req, res) => {
        try {
            const { slug } = req.params;
            const { code } = req.body;
            const isValid = await tenantManager.verifyAccess(slug, code);
            res.json({ success: isValid });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Verification failed' });
        }
    });

    server.delete('/api/tenant/:slug/user/:userId', async (req, res) => {
        try {
            const { slug, userId } = req.params;
            const db = await getDB();

            // Verify user belongs to tenant to be safe(r)
            const tenant = await tenantManager.getTenant(slug);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

            const user = await db.get('SELECT * FROM users WHERE id = ? AND tenant_id = ?', [userId, tenant.tenant_id]);
            if (!user) return res.status(404).json({ error: 'User not found' });

            // Delete user and sessions
            await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM users WHERE id = ?', [userId]);

            res.json({ success: true });
        } catch (e) {
             console.error(e);
             res.status(500).json({ error: 'Failed to delete user' });
        }
    });

    // --- SUPERADMIN METRICS ---
    const ADMIN_PASSWORD = process.env.ADMIN_KEY || 'admin123'; // Environment variable for production security

    const checkAdminAuth = (req: any, res: any, next: any) => {
        const key = req.headers['x-admin-key'];
        if (key !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
        }
        next();
    };

    server.get('/api/superadmin/tenants', checkAdminAuth, async (req, res) => {
        try {
            const tenants = await tenantManager.getAllTenants();
            res.json({ tenants });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch tenants' });
        }
    });

    server.post('/api/superadmin/tenants', checkAdminAuth, async (req, res) => {
        try {
            const { slug, name, visibility, accessCode } = req.body;
            if (!slug) return res.status(400).json({ error: 'Slug is required' });

            // Check if exists
            const existing = await tenantManager.getTenant(slug);
            if (existing) return res.status(409).json({ error: 'Tenant already exists' });

            const tenant = await tenantManager.createTenant(slug, name, visibility, accessCode);
            res.json({ tenant });
        } catch (e) {
            console.error('Create Tenant Error:', e);
            res.status(500).json({ error: 'Failed to create tenant' });
        }
    });

    server.post('/api/superadmin/tenant/:id', checkAdminAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body; // { visibility, allowed_games }
            await tenantManager.updateTenant(id, updates);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to update tenant' });
        }
    });

    server.get('/api/superadmin/tenant/:id/users', checkAdminAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const users = await tenantManager.getTenantUsers(id);
            res.json({ users });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    server.post('/api/superadmin/user/:id/role', checkAdminAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            await tenantManager.setUserRole(id, role);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed to update user role' });

        }
    });

    server.post('/api/user', async (req, res) => {
        console.log('[API] /api/user request received:', req.body);
        const { username, avatar, deviceId, tenantSlug } = req.body;

        if (!username) return res.status(400).json({ error: 'Username required' });
        if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

        try {
            const db = await getDB();

            // Resolve Tenant (Optional for legacy support but required for new flow)
            let tenantId = null;
            if (tenantSlug) {
                const tenant = await tenantManager.getTenant(tenantSlug);
                if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
                tenantId = tenant.tenant_id;
            }

            // 1. Check if username exists (Scoped to Tenant if provided)
            let query = 'SELECT * FROM users WHERE username = ?';
            let params = [username];

            // If tenant context exists, scope the check
            if (tenantId) {
                query += ' AND tenant_id = ?';
                params.push(tenantId);
            } else {
                 // For legacy global users, ensure they don't have a tenant_id?
                 // Or just find match. Let's assume global for now if no tenant.
                 query += ' AND tenant_id IS NULL';
            }

            const existingUser = await db.get(query, params);

            if (existingUser) {
                // 2. If user exists, check deviceId
                console.log(`[LOGIN DEBUG] Existing User Found: ${existingUser.username}. DB Device: ${existingUser.deviceId}, Req Device: ${deviceId}`);

                if (existingUser.deviceId === deviceId) {
                    // Match! Grant access
                    const session = await AuthService.createSession(existingUser.id, existingUser.username, existingUser.avatar);
                    return res.json({
                        user: existingUser,
                        session,
                        playerId: existingUser.id,
                        role: existingUser.role || 'player'
                    });
                } else {
                    return res.status(403).json({
                        error: `This name is already taken in this workspace. (Your ID: ${deviceId?.substring(0,5)}... vs Owner ID: ${existingUser.deviceId?.substring(0,5)}...)`
                    });
                }
            } else {
                // 4. Create New Profile
                const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
                const userAvatar = avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${username}`;

                // Determine Role
                let role = 'player';
                if (tenantId) {
                    const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?', [tenantId]);
                    if (!userCount || userCount.count === 0) {
                        role = 'admin';
                    }
                }

                await db.run(
                    'INSERT INTO users (id, username, avatar, deviceId, tenant_id, role, createdAt, lastOnline, isLoggedIn) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)',
                    [id, username, userAvatar, deviceId, tenantId, role]
                );

                const session = await AuthService.createSession(id, username, userAvatar);

                res.json({
                    user: { id, username, avatar: userAvatar, role, tenantId },
                    session,
                    playerId: id
                });
            }
        } catch (e: any) {
            console.error("API Error /api/user:", e);
            res.status(500).json({ error: 'Failed to process login: ' + e.message });
        }
    });

    // Session Management
    server.post('/api/auth/session', async (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });
        const session = await AuthService.validateSession(token);
        if (session) {
            res.json(session);
        } else {
            res.status(401).json({ error: 'Invalid or expired session' });
        }
    });

    server.delete('/api/auth/session', async (req, res) => {
        const { token } = req.body;
        if (token) await AuthService.logout(token);
        res.json({ success: true });
    });

    // Categories Game API
    server.get('/api/categories/session/:sessionId', async (req, res) => {
        try {
            const session = await categoriesGameManager.getSession(req.params.sessionId);
            if (session) {
                res.json(session);
            } else {
                res.status(404).json({ error: 'Session not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    server.get('/api/categories/room/:roomCode', async (req, res) => {
        try {
            const session = await categoriesGameManager.getSessionByRoomCode(req.params.roomCode);
            if (session) {
                res.json({
                    sessionId: session.sessionId,
                    categories: session.categories,
                    totalRounds: session.totalRounds,
                    roundDuration: session.roundDuration,
                    allowedLetters: session.allowedLetters,
                    currentRound: session.currentRound,
                    currentLetter: session.currentLetter,
                    status: session.status,
                    overallTimeLeft: session.overallTimeLeft
                });
            } else {
                res.status(404).json({ error: 'Session not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 3. Game Sockets
    io.on('connection', (socket) => {

        socket.on('create_room', async ({ name, avatar, gameType, company, product, playerId, roomCode, config, tenantSlug }, callback) => {
            // Resolve Tenant
            let tenantId = undefined;
            let resolvedCompany = company;

            if (tenantSlug) {
                const tenant = await tenantManager.getTenant(tenantSlug);
                if (tenant) {
                    tenantId = tenant.tenant_id;
                    if (!resolvedCompany) resolvedCompany = tenant.name;
                }
            }

            const type = gameType || 'rebus';
            const code = gameManager.createRoom(name, socket.id, type, {
                company: resolvedCompany,
                product,
                hostAvatar: avatar,
                playerId,
                config,
                tenantId,
                tenantSlug
            }, roomCode);

            // Handle Categories specific setup if needed
            if (type === 'categories' && config && config.categories) {
                try {
                    console.log('[Categories] Auto-creating session from create_room:', { code, playerId, config });
                    await categoriesGameManager.createSession(code, playerId, {
                        categories: config.categories,
                        totalRounds: Math.max(1, Math.floor(((config.gameDuration || 10) * 60) / (config.roundDuration || 60))),
                        roundDuration: config.roundDuration || 60,
                        allowedLetters: config.allowedLetters
                    });
                } catch (e) {
                    console.error('[Categories] Failed to auto-create session:', e);
                }
            }

            socket.join(code);
            if (callback) callback({ success: true, roomCode: code });
        });

        socket.on('check_room', ({ roomCode }, callback) => {
            const room = gameManager.getRoomInfo(roomCode);
            if (room) {
                callback({
                    success: true,
                    gameType: room.gameType,
                    tenantSlug: room.tenantSlug,
                    tenantName: room.metadata?.company
                });
            } else {
                 // Try DB check for categories persistence
                 categoriesGameManager.getSessionByRoomCode(roomCode).then(session => {
                     if (session) {
                         callback({ success: true, gameType: 'categories' });
                     } else {
                         callback({ success: false, error: 'Room not found' });
                     }
                 }).catch(e => callback({ success: false, error: 'Error checking room' }));
            }
        });

        socket.on('join_room', async ({ name, avatar, roomCode, playerId }, callback) => {
            console.log(`[Server DEBUG] Join Room Request: roomCode=${roomCode}, name=${name}, pId=${playerId}`);

            if (!roomCode) {
                socket.emit('error_message', { message: 'Invalid Room Code' });
                return;
            }

            // Sanitize playerId (handle 'undefined' string from query)
            const sanitizedPlayerId = (playerId === 'undefined' || !playerId) ? null : playerId;

            // Sync user to DB for game persistence (especially Categories)
            try {
                const db = await getDB();
                await db.run(
                    `INSERT OR REPLACE INTO users (id, username, avatar, lastOnline)
                     VALUES (?, ?, ?, datetime('now'))`,
                    [sanitizedPlayerId || socket.id, name, avatar]
                );
            } catch (err) { console.error("[Server] Error syncing user to DB:", err); }

            let room = gameManager.addPlayer(roomCode, name, socket.id, false, avatar, sanitizedPlayerId);

            if (!room) {
                 console.log(`[Server DEBUG] Room ${roomCode} not found in memory. Attempting DB restoration...`);

                 // Try to restore Categories room from DB session
                 try {
                     const session = await categoriesGameManager.getSessionByRoomCode(roomCode);
                     if (session) {
                         console.log(`[Server DEBUG] Session found for ${roomCode}. HostId: ${session.hostId}`);
                         const hostName = await categoriesGameManager.getHostName(session.hostId) || "Host";
                         console.log(`[Server DEBUG] Hostname resolved: ${hostName}`);

                         // Create the room
                         gameManager.createRoom(
                             hostName,
                             'RESTORED_HOST_PLACEHOLDER',
                             'categories',
                             { playerId: session.hostId },
                             roomCode
                         );
                         console.log(`[Server DEBUG] Room ${roomCode} restored successfully.`);

                         // Try adding player again
                         room = gameManager.addPlayer(roomCode, name, socket.id, false, avatar, playerId);
                     } else {
                        console.log(`[Server DEBUG] No session found in DB for code ${roomCode}`);
                     }
                 } catch (err) {
                     console.error("[Server DEBUG] Error restoring room:", err);
                 }
            }

            if (room) {
                console.log(`[Server DEBUG] Join successful for ${roomCode}`);

                // Sync Categories scores if applicable
                if (room.gameType === 'categories') {
                    try {
                        const session = await categoriesGameManager.getSessionByRoomCode(roomCode);
                        if (session) {
                            const leaderboard = await categoriesGameManager.getLeaderboard(session.sessionId);
                            console.log(`[Categories] Syncing scores for ${roomCode}. Leaderboard:`, JSON.stringify(leaderboard));

                            room.players.forEach(p => {
                                const entry = leaderboard.find((l: any) =>
                                    (p.playerId && l.playerId === p.playerId) ||
                                    (l.username === p.name && l.username !== 'Player') ||
                                    (l.playerId === p.id)
                                );
                                if (entry) {
                                    p.score = entry.totalScore || 0;
                                    console.log(`[Categories] Restored score for ${p.name}: ${p.score}`);
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[Categories] Score sync error on join:', e);
                    }
                }

                socket.join(roomCode);
                if (callback) callback({ success: true, room: gameManager.sanitizeRoom(room) });
            } else {
                console.log(`[Server DEBUG] Join failed - Room not found for ${roomCode}`);
                if (callback) callback({ success: false, error: 'Room not found' });
            }
        });

        socket.on('start_game', ({ roomCode, settings }) => {
            gameManager.startGame(roomCode, settings);
        });

        socket.on('update_settings', ({ roomCode, settings }) => {
            gameManager.updateSettings(roomCode, settings);
        });

        socket.on('restart_game', ({ roomCode }) => {
            gameManager.resetGame(roomCode);
        });

        socket.on('submit_guess', ({ roomCode, guess }) => {
            gameManager.handleGuess(roomCode, socket.id, guess);
        });

        socket.on('send_chat', ({ roomCode, message }) => {
            gameManager.handleGuess(roomCode, socket.id, message);
        });

        // Draw Game
        socket.on('select_word', ({ roomCode, word }) => {
            gameManager.selectWord(roomCode, socket.id, word);
        });

        socket.on('draw_stroke', ({ roomCode, data }) => {
            gameManager.handleDrawStroke(roomCode, socket.id, data);
        });

        socket.on('disconnect', () => {
            gameManager.removePlayer(socket.id);
        });

        // --- WebRTC Signaling ---

        // User joins the video channel
        socket.on('join_video', ({ roomCode }) => {
            // Check if room allows video? (TODO: check db/manager)
            // For now, allow signaling.
            // Notify other players in the room that a new peer joined for video
            socket.to(roomCode).emit('user_joined_video', { socketId: socket.id });
        });

        // Peer-to-Peer Signal Relay (Offer, Answer, ICE Candidate)
        socket.on('signal', ({ targetId, signal }) => {
            io.to(targetId).emit('signal', {
                senderId: socket.id,
                signal
            });
        });

        // Media Status Updates (Mute/Unmute)
        socket.on('toggle_media', ({ roomCode, kind, status }) => {
            // kind: 'video' | 'audio', status: boolean
            socket.to(roomCode).emit('peer_media_update', {
                socketId: socket.id,
                kind,
                status
            });
        });

        // --- CATEGORIES GAME EVENTS ---

        // Create Categories game session
        socket.on('categories:create_session', async ({ roomCode, hostId, hostName, company, product, config }, callback) => {
            try {
                const sanitizedHostId = (hostId === 'undefined' || !hostId) ? socket.id : hostId;
                const sessionId = await categoriesGameManager.createSession(roomCode, sanitizedHostId, config);

                // ALSO create the standard room so players can join
                // createRoom(hostName, socketId, gameType, metadata, forcedCode)
                gameManager.createRoom(hostName || "Host", socket.id, 'categories', { playerId: hostId, company, product }, roomCode);

                socket.join(roomCode);

                if (callback) {
                    callback({ success: true, sessionId });
                }

                // Notify room
                io.to(roomCode).emit('categories:session_created', {
                    sessionId,
                    categories: config.categories,
                    totalRounds: config.totalRounds,
                    roundDuration: config.roundDuration,
                    allowedLetters: config.allowedLetters
                });
            } catch (error: any) {
                console.error('[Categories] Create session error:', error);
                if (callback) {
                    callback({ success: false, error: error.message });
                }
            }
        });

        // Update config (Anyone can change)
        socket.on('categories:update_config', async ({ sessionId, roomCode, config }) => {
            try {
                await categoriesGameManager.updateConfig(sessionId, config);
                io.to(roomCode).emit('categories:config_updated', config);
            } catch (err: any) {
                socket.emit('categories:error', { message: err.message });
            }
        });

        // Helper for global timer heartbeat
        const startGlobalHeartbeat = (sessionId: string, roomCode: string) => {
            const existing = categoriesGameManager.getTimer(sessionId, 'global');
            if (existing) return;

            const interval = setInterval(async () => {
                const timeLeft = await categoriesGameManager.tickGlobalTimer(sessionId);
                if (timeLeft < 0) {
                    clearInterval(interval);
                    categoriesGameManager.clearTimer(sessionId, 'global');
                    return;
                }
                io.to(roomCode).emit('categories:timer_update', { timeLeft });

                if (timeLeft === 0) {
                    console.log('[Categories] Global Time is up for session:', sessionId);
                    clearInterval(interval);
                    categoriesGameManager.clearTimer(sessionId, 'global');

                    // Force end the round if active
                    const session = await categoriesGameManager.getSession(sessionId);
                    if (session && session.status === 'active') {
                        await categoriesGameManager.endAnswerPhase(sessionId);
                        io.to(roomCode).emit('categories:answer_phase_ended', { reason: 'global_timer' });
                        const answers = await categoriesGameManager.getRoundAnswers(sessionId, session.currentRound);
                        io.to(roomCode).emit('categories:review_started', { answers, roundNumber: session.currentRound });
                    }
                }
            }, 1000);

            categoriesGameManager.setTimer(sessionId, interval, 'global');
        };

        // Start a new round
        socket.on('categories:start_round', async ({ sessionId, roomCode }) => {
            try {
                const { letter, roundNumber } = await categoriesGameManager.startRound(sessionId);
                const session = await categoriesGameManager.getSession(sessionId);
                if (!session) throw new Error('Session not found');

                io.to(roomCode).emit('categories:round_started', {
                    letter,
                    roundNumber,
                    duration: session.roundDuration,
                    totalRounds: session.totalRounds,
                    overallTimeLeft: session.overallTimeLeft
                });

                startGlobalHeartbeat(sessionId, roomCode);

                // Auto-end round after duration
                const timer = setTimeout(async () => {
                    await categoriesGameManager.endAnswerPhase(sessionId);
                    io.to(roomCode).emit('categories:answer_phase_ended', { roundNumber });

                    // Trigger results/voting phase
                    const answers = await categoriesGameManager.getRoundAnswers(sessionId, roundNumber);
                    io.to(roomCode).emit('categories:review_started', { answers, roundNumber });
                }, session.roundDuration * 1000);

                categoriesGameManager.setTimer(sessionId, timer);

            } catch (error: any) {
                console.error('[Categories] Start round error:', error);
                socket.emit('categories:error', { message: error.message });
            }
        });

        // Manually STOP round
        socket.on('categories:stop_round', async ({ sessionId, roomCode, roundNumber }) => {
            categoriesGameManager.clearTimer(sessionId);
            await categoriesGameManager.endAnswerPhase(sessionId);
            io.to(roomCode).emit('categories:answer_phase_ended', { roundNumber, stoppedBy: socket.id });

            // Trigger results/voting phase
            const answers = await categoriesGameManager.getRoundAnswers(sessionId, roundNumber);
            io.to(roomCode).emit('categories:review_started', { answers, roundNumber });
        });

        // Submit answer
        socket.on('categories:submit_answer', async ({ sessionId, playerId, category, answer }) => {
            try {
                const sanitizedPlayerId = (playerId === 'undefined' || !playerId) ? socket.id : playerId;
                await categoriesGameManager.submitAnswer(sessionId, sanitizedPlayerId, category, answer);
                socket.emit('categories:answer_submitted', { category, success: true });
            } catch (error: any) {
                socket.emit('categories:answer_error', { category, error: error.message });
            }
        });

        // Handle Voting
        socket.on('categories:submit_vote', async ({ sessionId, roomCode, roundNumber, targetPlayerId, category, voteType }) => {
            await categoriesGameManager.voteAnswer(sessionId, roundNumber, targetPlayerId, category, voteType);
            io.to(roomCode).emit('categories:vote_updated', { targetPlayerId, category, voteType });
        });

        // Finalize Review and show scores
        socket.on('categories:finalize_round', async ({ sessionId, roomCode, roundNumber }) => {
            const scores = await categoriesGameManager.finalizeRound(sessionId);
            const answers = await categoriesGameManager.getRoundAnswers(sessionId, roundNumber);
            const session = await categoriesGameManager.getSession(sessionId);

            const room = gameManager.getRoomInfo(roomCode);
            if (room) {
                const leaderboard = await categoriesGameManager.getLeaderboard(sessionId);
                console.log(`[Categories] Finalizing ${roomCode}. Leaderboard:`, JSON.stringify(leaderboard));
                console.log(`[Categories] Room Players:`, room.players.map(p => ({ name: p.name, id: p.id, playerId: p.playerId })));

                room.players.forEach(p => {
                    // Try matching by playerId, then by name
                    const entry = leaderboard.find((l: any) =>
                        (p.playerId && l.playerId === p.playerId) ||
                        (l.username === p.name && l.username !== 'Player') ||
                        (l.playerId === p.id)
                    );

                    if (entry) {
                        console.log(`[Categories] Updating score for ${p.name}: ${entry.totalScore}`);
                        p.score = entry.totalScore || 0;
                    } else {
                        console.log(`[Categories] No score entry found for ${p.name}`);
                    }
                });
                // Broadcast update so sidebar reflects new scores
                io.to(roomCode).emit('update_room', gameManager.sanitizeRoom(room));
            }

            io.to(roomCode).emit('categories:round_ended', {
                roundNumber,
                scores,
                answers,
                letter: session?.currentLetter
            });

            if (session?.status === 'finished') {
                const leaderboard = await categoriesGameManager.getLeaderboard(sessionId);
                io.to(roomCode).emit('categories:game_ended', { leaderboard });
            }
        });

        // Get current leaderboard
        socket.on('categories:get_leaderboard', async ({ sessionId }, callback) => {
            try {
                const leaderboard = await categoriesGameManager.getLeaderboard(sessionId);
                if (callback) callback({ success: true, leaderboard });
            } catch (error: any) {
                if (callback) callback({ success: false, error: error.message });
            }
        });
    });

    // 4. Next.js Request Handler (Must be last)
    server.use((req, res) => {
        return handle(req, res);
    });

    const port = parseInt(process.env.PORT || '3000', 10);
    httpServer.listen(port, '0.0.0.0', () => {
        console.log(`> VirtualGames Server Ready on http://localhost:${port} (and network)`);
    });
});
