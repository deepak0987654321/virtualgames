import { Server, Socket } from 'socket.io';
import { TOPICS, DRAW_WORDS, Puzzle, DrawWord } from './puzzles';
import leaderboardStore from './LeaderboardStore';

// Types
type GameType = 'rebus' | 'draw' | 'charades' | 'categories';
type RoomState = 'LOBBY' | 'PLAYING' | 'ENDED' | 'SELECTING_WORD' | 'DRAWING' | 'ACTING' | 'ROUND_END';

interface Player {
    id: string; // socketId
    socketId: string;
    playerId?: string; // Persistent ID
    name: string;
    avatar?: string;
    score: number;
    team?: 'red' | 'blue';
    isHost: boolean;
    hasGuessed: boolean;
}

interface Room {
    code: string;
    gameType: GameType;
    metadata: any;
    players: Player[];
    teams: { red: number; blue: number }; // Team Scores
    state: RoomState;
    rounds: number;
    currentRound: number;
    roundTime: number; // Duration of a round/puzzle

    // Timer Handles
    timer: NodeJS.Timeout | null; // Global game timer
    puzzleTimer: NodeJS.Timeout | null; // Individual puzzle/round timer
    roundTimer: NodeJS.Timeout | null; // Draw round timer
    deleteTimeout: NodeJS.Timeout | null;

    // Game Specific State
    currentPuzzle: Puzzle | null; // Rebus
    currentWord: string | null; // Draw or Rebus Answer
    answerStr?: string; // Rebus full answer string
    maskedAnswer?: string;

    // Draw Game Specifics
    currentDrawer: string | null; // socketId
    wordChoices: DrawWord[];
    canvasHistory: any[];
    drawerQueue?: string[];

    // Time Management
    duration?: number; // Total game duration in seconds
    turnTime?: number; // Turn duration for Draw
    timeLeft: number; // Global time left
    roundTimeLeft?: number; // Specific round time left
    puzzleTimeLeft?: number; // specific puzzle time left

    usedPuzzles: Set<number>;
    hardcoreMode?: boolean;
    teamMode?: boolean;
    videoEnabled?: boolean;
    tenantId?: string;
    tenantSlug?: string;
}

interface GameSettings {
    duration?: number;
    turnTime?: number;
    puzzleTime?: number;
    hardcore?: boolean;
    teamMode?: boolean;
    teamConfig?: any;
    videoEnabled?: boolean;
}

export class GameManager {
    private io: Server;
    private rooms: Map<string, Room>;

    constructor(io: Server) {
        this.io = io;
        this.rooms = new Map();
    }

    // ... createRoom, addPlayer, removePlayer ...

    createRoom(hostName: string, socketId: string, gameType: GameType = 'rebus', metadata: any = {}, forcedCode?: string): string {
        const code = forcedCode || Math.random().toString(36).substring(2, 6).toUpperCase();

        // Extract Config
        const config = metadata.config || {};

        const room: Room = {
            code,
            gameType,
            metadata,
            players: [],
            teams: { red: 0, blue: 0 },
            state: 'LOBBY',

            // Apply Config or Defaults
            rounds: config.rounds || 5, // Actually, we might use this as 'duration' multiplier or rounds

            // Rebus/Draw specific round/turn timer
            roundTime: config.roundTime || (gameType === 'rebus' ? 30 : 60),

            // Global Game Duration (using rounds as a proxy for now if needed, or just default)
            // But wait, the UI sends "rounds" and "roundTime".
            // For Rebus: Duration = rounds * roundTime? Or Duration is separate?
            // The UI has "Rounds [2,3,5...]" and "Round Time [30,60...]".
            // In Skribbl, you set "Rounds" and "Draw Time". Total duration is dynamic.
            // Our current logic uses `duration` (Total Game Time).
            // Let's adapt: If rounds is set, we calculate approximate duration or change logic effectively.
            // For now, let's store them and respect them in startGame.

            // Global Game Duration
            duration: config.gameDuration ? config.gameDuration * 60 : ((config.rounds || 5) * (config.roundTime || 60) * 2),

            timer: null,
            puzzleTimer: null,
            roundTimer: null,
            deleteTimeout: null,
            currentPuzzle: null,
            currentWord: null,
            currentDrawer: null,
            wordChoices: [],
            canvasHistory: [],
            timeLeft: 0,
            usedPuzzles: new Set(),
            currentRound: 0,

            // Config Flags
            teamMode: !!config.teamMode,
            videoEnabled: !!config.video,
            tenantId: metadata.tenantId,
            tenantSlug: metadata.tenantSlug
        };
        this.rooms.set(code, room);
        this.addPlayer(code, hostName, socketId, true, metadata.hostAvatar, metadata.playerId);
        return code;
    }

    getRoomInfo(code: string): Room | undefined {
        return this.rooms.get(code);
    }

    addPlayer(roomCode: string, name: string, socketId: string, isHost: boolean = false, avatar?: string, playerId?: string): Room | null {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        if (room.deleteTimeout) {
            clearTimeout(room.deleteTimeout);
            room.deleteTimeout = null;
        }

        const existingPlayerIndex = room.players.findIndex(p => (playerId && p.playerId === playerId) || p.name === name);

        if (existingPlayerIndex !== -1) {
            room.players[existingPlayerIndex].socketId = socketId;
            room.players[existingPlayerIndex].id = socketId;
            if (avatar) room.players[existingPlayerIndex].avatar = avatar; // Update avatar
            this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));

            // If Draw game, send current canvas state
            if (room.gameType === 'draw' && room.canvasHistory.length > 0) {
                this.io.to(socketId).emit('canvas_history', room.canvasHistory);
            }
            return room;
        }

        const existingSocket = room.players.find(p => p.socketId === socketId);
        if (existingSocket) return room;

        const isFirstPlayer = room.players.length === 0;

        const player: Player = {
            id: socketId,
            socketId,
            playerId,
            name,
            avatar,
            score: 0,
            isHost: isHost || isFirstPlayer,
            hasGuessed: false
        };

        // Assign team if joining mid-game in team mode
        if (room.teamMode) {
            const reds = room.players.filter(p => p.team === 'red').length;
            const blues = room.players.filter(p => p.team === 'blue').length;
            player.team = reds <= blues ? 'red' : 'blue';
        }

        room.players.push(player);
        this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));
        return room;
    }

    removePlayer(socketId: string) {
        for (const [code, room] of this.rooms) {
            const index = room.players.findIndex(p => p.socketId === socketId);
            if (index !== -1) {
                const wasHost = room.players[index].isHost;
                const wasDrawer = room.currentDrawer === socketId;

                room.players.splice(index, 1);

                if (room.players.length === 0) {
                    room.deleteTimeout = setTimeout(() => {
                        if (this.rooms.has(code) && this.rooms.get(code)!.players.length === 0) {
                            this.rooms.delete(code);
                        }
                    }, 10000);
                } else {
                    if (wasHost) {
                        room.players[0].isHost = true;
                    }

                    // If the drawer left, end the round
                    if (wasDrawer && room.state === 'DRAWING') {
                        this.handleDrawRoundEnd(code, 'Drawer left!');
                    }

                    this.io.to(code).emit('update_room', this.sanitizeRoom(room));
                }
                return;
            }
        }
    }

    updateSettings(roomCode: string, settings: Partial<GameSettings>) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        console.log(`[GameManager] Updating settings for room ${roomCode}:`, settings);

        if (settings.videoEnabled !== undefined) {
             room.videoEnabled = settings.videoEnabled;
             console.log(`[GameManager] Video Enabled set to: ${room.videoEnabled}`);
        }

        this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));
    }

    startGame(roomCode: string, settings: GameSettings = {}) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        console.log(`[GameManager] startGame called for room ${roomCode} (${room.gameType})`);

        room.players.forEach(p => p.score = 0);
        room.currentRound = 0;

        // Apply Settings (Only override if provided)
        if (settings.hardcore !== undefined) room.hardcoreMode = !!settings.hardcore;
        if (settings.teamMode !== undefined) room.teamMode = !!settings.teamMode;
        if (settings.videoEnabled !== undefined) room.videoEnabled = !!settings.videoEnabled;

        room.teams = { red: 0, blue: 0 };

        if (room.teamMode) {
             if (settings.teamConfig && settings.teamConfig.mode === 'manual' && settings.teamConfig.teams) {
                 // Manual Assignment
                 const manualTeams = settings.teamConfig.teams;
                 room.players.forEach(p => {
                     if (manualTeams[p.id]) {
                         p.team = manualTeams[p.id];
                     } else {
                         p.team = 'red';
                     }
                 });
             } else {
                 // Randomly shuffle Only if teams not already assigned?
                 // Actually, if we are starting game, we might want to re-shuffle or keep existing.
                 // Let's shuffle if no teams assigned.
                 const hasTeams = room.players.some(p => !!p.team);
                 if (!hasTeams) {
                    const shuffled = [...room.players].sort(() => 0.5 - Math.random());
                    shuffled.forEach((p, idx) => {
                        p.team = idx % 2 === 0 ? 'red' : 'blue';
                    });
                 }
             }
        } else {
             room.players.forEach(p => delete p.team);
        }

        if (room.gameType === 'rebus') {
            this.startRebusGame(room, settings);
        } else if (room.gameType === 'draw' || room.gameType === 'charades') {
            // Charades shares logic with Draw (Turn based, selector, timer)
            this.startDrawGame(room, settings);
        }
    }

    // --- DRAW & GUESS LOGIC ---

    startDrawGame(room: Room, settings: GameSettings) {
        // Global Duration
        if (settings.duration) {
            room.duration = settings.duration * 60; // Convert to seconds
        } else if (!room.duration) {
            room.duration = 300; // Default 5 min
        }

        // Turn Duration
        if (settings.turnTime) {
            room.turnTime = Number(settings.turnTime);
        } else {
            room.turnTime = 60; // Default 60s
        }

        room.timeLeft = room.duration;
        room.rounds = 999;

        room.drawerQueue = [...room.players.map(p => p.socketId)];
        // Shuffle drawer order
        for (let i = room.drawerQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [room.drawerQueue[i], room.drawerQueue[j]] = [room.drawerQueue[j], room.drawerQueue[i]];
        }

        this.io.to(room.code).emit('update_room', this.sanitizeRoom(room));
        this.startGlobalTimer(room.code);
        this.startDrawRound(room.code);
    }

    startDrawRound(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        if (room.roundTimer) clearInterval(room.roundTimer);

        // Check Global Timer
        if (room.timeLeft <= 0) {
            this.endGame(roomCode);
            return;
        }

        // Rotate Drawer
        if (!room.drawerQueue || room.drawerQueue.length === 0) {
            // Refill queue
            room.drawerQueue = [...room.players.map(p => p.socketId)];
        }

        room.currentRound++;

        const drawerId = room.drawerQueue.shift();
        if (!drawerId) return; // Should not happen

        room.currentDrawer = drawerId;
        room.state = 'SELECTING_WORD';
        room.players.forEach(p => p.hasGuessed = false);
        room.canvasHistory = [];
        this.io.to(roomCode).emit('clear_canvas');

        // Generate Choices
        const choices: DrawWord[] = [];
        for (let i = 0; i < 3; i++) {
            choices.push(DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)]);
        }
        room.wordChoices = choices;

        this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));
        this.io.to(roomCode).emit('round_start_selecting', { drawer: drawerId });
        this.io.to(drawerId).emit('your_turn_to_draw', choices);

        // Timeout for selection
        room.roundTimer = setTimeout(() => {
            if (room.state === 'SELECTING_WORD') {
                // Auto select first word
                this.selectWord(roomCode, drawerId, choices[0].word);
            }
        }, 15000); // 15s to choose
    }

    selectWord(roomCode: string, socketId: string, word: string) {
        const room = this.rooms.get(roomCode);
        if (!room || room.currentDrawer !== socketId) return;

        if (room.roundTimer) clearTimeout(room.roundTimer);

        room.currentWord = word;
        room.state = room.gameType === 'charades' ? 'ACTING' : 'DRAWING';
        room.roundTime = room.turnTime || 60; // Configurable drawing time
        room.roundTimeLeft = room.turnTime || 60;

        // Masked word for guessers
        const masked = word.split('').map(c => c === ' ' ? ' ' : '_').join('');
        room.maskedAnswer = masked;

        this.io.to(roomCode).emit('start_drawing_phase', {
            drawer: room.currentDrawer,
            timeLeft: room.roundTimeLeft,
            maskedAnswer: masked,
            length: word.length
        });

        this.io.to(socketId).emit('you_are_drawing', { word });

        // Start Round Timer
        if (room.roundTimer) clearInterval(room.roundTimer);
        room.roundTimer = setInterval(() => {
            if (room.roundTimeLeft !== undefined) room.roundTimeLeft--;

            // Auto-Hint Logic
            if (room.roundTimeLeft === 30 || room.roundTimeLeft === 15) {
                this.revealHint(roomCode);
            }

            if (room.roundTimeLeft !== undefined && room.roundTimeLeft <= 0) {
                this.handleDrawRoundEnd(roomCode, 'Time is up!');
            }
        }, 1000);
    }

    revealHint(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room || !room.currentWord || !room.maskedAnswer) return;
        if (room.hardcoreMode) return; // Hardcore: No hints!

        const answer = room.currentWord;
        const mask = room.maskedAnswer.split('');
        const hiddenIndices: number[] = [];

        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === '_' && answer[i] !== ' ') hiddenIndices.push(i);
        }

        // Don't reveal if already mostly revealed (>= 50%)
        const totalLetters = answer.replace(/ /g, '').length;
        const currentRevealed = totalLetters - hiddenIndices.length;
        if (currentRevealed >= Math.ceil(totalLetters / 2)) return;

        if (hiddenIndices.length > 0) {
            const idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
            mask[idx] = answer[idx];
            room.maskedAnswer = mask.join('');

            this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));
            this.io.to(roomCode).emit('chat_message', {
                id: Math.random().toString(),
                playerId: 'GAME',
                playerName: 'System',
                text: 'A hint has been revealed!',
                type: 'system'
            });
        }
    }

    handleDrawStroke(roomCode: string, socketId: string, data: any) {
        const room = this.rooms.get(roomCode);
        if (!room || room.state !== 'DRAWING' || room.currentDrawer !== socketId) return;

        room.canvasHistory.push(data);
        // Broadcast stroke
        this.io.to(roomCode).emit('draw_stroke', data);
    }

    handleDrawRoundEnd(roomCode: string, reason: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        if (room.roundTimer) clearInterval(room.roundTimer);

        this.io.to(roomCode).emit('round_end', {
            reason,
            answer: room.currentWord,
            scores: room.players.map(p => ({ id: p.id, score: p.score }))
        });

        setTimeout(() => {
            this.startDrawRound(roomCode);
        }, 5000);
    }

    handleDrawGuess(room: Room, player: Player, text: string) {
        if (room.currentDrawer === player.id) return; // Drawer cannot guess
        if (player.hasGuessed) return;
        if (!room.currentWord) return;

        // TEAM BATTLE RESTRICTION (Draw & Guess)
        if (room.teamMode && room.gameType === 'draw') {
             const drawer = room.players.find(p => p.socketId === room.currentDrawer);
             // If player is NOT on the drawer's team, they cannot score
             if (drawer && drawer.team && player.team && drawer.team !== player.team) {
                  // Opposing team member. Send as chat only.
                  this.io.to(room.code).emit('chat_message', {
                        id: Math.random().toString(),
                        playerId: player.id,
                        playerName: player.name,
                        text: text,
                        type: 'chat'
                   });
                   return;
             }
        }

        const guess = text.toLowerCase().trim();
        const correct = room.currentWord.toLowerCase().trim();

        if (guess === correct) {
            player.hasGuessed = true;

            // Points: Speed based.
            // Max 500, Min 100.
            const percentage = (room.roundTimeLeft || 0) / (room.roundTime || 60);
            const points = Math.floor(100 + (400 * percentage));

            player.score += points;

            // Team Scoring
            if (room.teamMode && player.team && room.teams) {
                 room.teams[player.team] += points;
            }

            // Drawer gets points too? (e.g. 50 pts per correct guess)
            const drawer = room.players.find(p => p.socketId === room.currentDrawer);
            if (drawer) {
                drawer.score += 50;
                if (room.teamMode && drawer.team && room.teams) {
                    room.teams[drawer.team] += 50;
                }
            }

            this.io.to(room.code).emit('correct_guess', { playerId: player.id, points });
            this.io.to(room.code).emit('update_room', this.sanitizeRoom(room));

            this.io.to(room.code).emit('chat_message', {
                id: Math.random().toString(),
                playerId: player.id,
                playerName: 'System',
                text: `${player.name} guessed the word!`,
                type: 'success'
            });

            // Check if all guessed (All TEAMMATES really)
            // If Team Mode, we only care if the Drawer's Team has all guessed.
            let relevantGuessers = room.players.filter(p => p.socketId !== room.currentDrawer);
            if (room.teamMode && room.gameType === 'draw') {
                const drawer = room.players.find(p => p.socketId === room.currentDrawer);
                if (drawer && drawer.team) {
                    relevantGuessers = relevantGuessers.filter(p => p.team === drawer.team);
                }
            }

            const allGuessed = relevantGuessers.length > 0 && relevantGuessers.every(p => p.hasGuessed);

            if (allGuessed) {
                this.handleDrawRoundEnd(room.code, 'All teammates guessed!');
            }

        } else {
            // Close Guess?
            if (this.levenshtein(guess, correct) <= 1) { // Simple check
                this.io.to(player.socketId).emit('system_message', "You are very close!");
            }

            this.io.to(room.code).emit('chat_message', {
                id: Math.random().toString(),
                playerId: player.id,
                playerName: player.name,
                text: text,
                type: 'chat'
            });
        }
    }

    // --- REBUS LOGIC ---

    startRebusGame(room: Room, settings: GameSettings) {
        // Global Duration
        if (settings.duration) {
            room.duration = settings.duration * 60; // Convert to seconds
        } else if (!room.duration) {
            room.duration = 300; // Default 5 min
        }

        // Puzzle Duration (Question Time)
        if (settings.puzzleTime) {
            room.roundTime = Number(settings.puzzleTime);
        } else {
            room.roundTime = 30; // Default 30s
        }

        room.state = 'PLAYING';
        room.timeLeft = room.duration;
        room.currentRound = 0;
        room.usedPuzzles.clear();

        this.io.to(room.code).emit('update_room', this.sanitizeRoom(room));
        this.startGlobalTimer(room.code);
        this.nextPuzzle(room.code);
    }

    startPuzzleTimer(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        if (room.puzzleTimer) clearInterval(room.puzzleTimer);

        room.puzzleTimeLeft = room.roundTime;

        room.puzzleTimer = setInterval(() => {
            if (room.puzzleTimeLeft !== undefined) room.puzzleTimeLeft--;
            if (room.puzzleTimeLeft !== undefined && room.puzzleTimeLeft <= 0) {
                if (room.puzzleTimer) clearInterval(room.puzzleTimer);
                this.handlePuzzleTimeout(roomCode);
            }
        }, 1000);
    }

    handlePuzzleTimeout(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room || !room.currentPuzzle) return;

        this.io.to(roomCode).emit('round_end', {
            answer: room.currentPuzzle.answer[0],
            scores: room.players.map(p => ({ id: p.id, score: p.score })),
            reason: 'timeout'
        });

        setTimeout(() => {
            this.nextPuzzle(roomCode);
        }, 3000);
    }

    nextPuzzle(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        if (room.timeLeft <= 0) {
            this.endGame(roomCode);
            return;
        }

        room.currentRound++;

        let targetDifficulty: 1 | 2 | 3 = 1;
        if (room.currentRound > 5) targetDifficulty = 2;
        if (room.currentRound > 12) targetDifficulty = 3;

        let pool = TOPICS.map((p, idx) => ({ ...p, originalIndex: idx }))
            .filter(p => !room.usedPuzzles.has(p.originalIndex));

        let bestPool = pool.filter(p => p.difficulty === targetDifficulty);
        if (bestPool.length === 0) bestPool = pool;
        if (bestPool.length === 0) {
            room.usedPuzzles.clear();
            pool = TOPICS.map((p, idx) => ({ ...p, originalIndex: idx }));
            bestPool = pool;
        }

        const selection = bestPool[Math.floor(Math.random() * bestPool.length)];
        const puzzleIndex = selection.originalIndex || 0;
        room.usedPuzzles.add(puzzleIndex);
        room.currentPuzzle = TOPICS[puzzleIndex];
        room.players.forEach(p => p.hasGuessed = false);

        const primaryAnswer = room.currentPuzzle.answer[0];
        room.answerStr = primaryAnswer.toUpperCase();

        let maskArr = room.answerStr.split('').map(char => /[A-Z0-9]/.test(char) ? '_' : char);

        // Smart Hint System
        const cleanLength = room.answerStr.replace(/[^A-Z0-9]/g, '').length;
        let revealCount = 1;

        if (room.hardcoreMode) {
             revealCount = 0;
        } else if (room.players.length <= 6 && cleanLength > 15) {
            revealCount = 3;
        } else if (cleanLength > 10) {
            revealCount = 2;
        }

        const revealableIndices: number[] = [];
        for (let i = 0; i < room.answerStr.length; i++) {
            if (/[A-Z0-9]/.test(room.answerStr[i])) revealableIndices.push(i);
        }

        for (let i = revealableIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [revealableIndices[i], revealableIndices[j]] = [revealableIndices[j], revealableIndices[i]];
        }

        for (let i = 0; i < Math.min(revealCount, revealableIndices.length - 1); i++) {
            const idx = revealableIndices[i];
            maskArr[idx] = room.answerStr[idx];
        }

        room.maskedAnswer = maskArr.join('');

        this.startPuzzleTimer(roomCode);

        this.io.to(roomCode).emit('round_start', {
            round: room.currentRound,
            puzzle: { ...room.currentPuzzle, puzzle: undefined }, // avoid sending whole object if not needed, or just puzzle
            maskedAnswer: room.maskedAnswer,
            timeLeft: room.timeLeft,
            puzzleTime: room.roundTime
        });
    }

    handleRebusGuess(room: Room, player: Player, text: string) {
        if (room.state !== 'PLAYING' || !room.currentPuzzle) return;
        if (player.hasGuessed) return;

        const answers = room.currentPuzzle.answer.map(a => a.toLowerCase().trim());
        const guess = text.toLowerCase().trim();

        if (answers.includes(guess)) {
            player.hasGuessed = true;
            player.hasGuessed = true;
            player.score += 100;

            // Team Scoring
            if (room.teamMode && player.team && room.teams) {
                 room.teams[player.team] += 100;
            }

            if (room.puzzleTimer) clearInterval(room.puzzleTimer);

            // Reveal full answer instantly
            if (room.maskedAnswer && room.answerStr) {
                const currentMask = room.maskedAnswer.split('');
                const answerChars = room.answerStr.split('');
                for (let i = 0; i < currentMask.length; i++) {
                    currentMask[i] = answerChars[i];
                }
                room.maskedAnswer = currentMask.join('');
            }

            this.io.to(room.code).emit('player_guessed', { playerId: player.id, points: 100 });
            this.io.to(player.socketId).emit('correct_guess', { points: 100 });
            this.io.to(room.code).emit('update_room', this.sanitizeRoom(room));

            this.io.to(room.code).emit('round_end', {
                answer: room.currentPuzzle.answer[0],
                scores: room.players.map(p => ({ id: p.id, score: p.score })),
                reason: 'solved'
            });

            setTimeout(() => {
                this.nextPuzzle(room.code);
            }, 3000);

        } else {
            this.io.to(room.code).emit('chat_message', {
                id: Math.random().toString(),
                playerId: player.id,
                playerName: player.name,
                text: text,
                type: 'chat'
            });
        }
    }

    // --- SHARED ---

    handleGuess(roomCode: string, socketId: string, text: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) return;

        if (room.gameType === 'draw' || room.gameType === 'charades') {
            this.handleDrawGuess(room, player, text);
        } else {
            this.handleRebusGuess(room, player, text);
        }
    }

    endGame(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        if (room.timer) clearInterval(room.timer);
        if (room.puzzleTimer) clearInterval(room.puzzleTimer);
        if (room.roundTimer) clearInterval(room.roundTimer);

        room.state = 'ENDED';
        room.timeLeft = 0; // Force 0 to avoid stuck timers

        // Sort players by score
        const sortedPlayers = room.players.map(p => ({ id: p.id, playerId: p.playerId, name: p.name, score: p.score, team: p.team })).sort((a, b) => b.score - a.score);

        // Save Winner to Leaderboard
        if (sortedPlayers.length > 0 && sortedPlayers[0].score > 0) {
            // Prepare results for DB
            const results = sortedPlayers.map((p, index) => ({
                playerId: p.playerId,
                name: p.name,
                score: p.score,
                team: p.team, // Pass Team Info
                isWinner: index === 0 && p.score > 0
            }));

            // Save to DB
            leaderboardStore.recordGameResult(
                results,
                room.gameType,
                room.metadata?.company,
                room.metadata?.product,
                room.tenantId // Pass tenantId
            ).catch(console.error);
        }

        this.io.to(roomCode).emit('update_room', this.sanitizeRoom(room));
        this.io.to(roomCode).emit('game_over', {
            players: sortedPlayers,
            teams: room.teams
        });
    }

    startGlobalTimer(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        if (room.timer) clearInterval(room.timer);

        room.timer = setInterval(() => {
            room.timeLeft--;
            if (room.timeLeft <= 0) {
                if (room.timer) clearInterval(room.timer);
                if (room.puzzleTimer) clearInterval(room.puzzleTimer);
                if (room.roundTimer) clearInterval(room.roundTimer);
                this.endGame(roomCode);
            }
        }, 1000);
    }

    levenshtein(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    resetGame(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        // Reuse existing settings if available
        const settings: GameSettings = {
            duration: room.duration ? room.duration / 60 : undefined,
            turnTime: room.turnTime,
            puzzleTime: room.roundTime,
            videoEnabled: room.videoEnabled,
            hardcore: room.hardcoreMode,
            teamMode: room.teamMode
        };

       this.startGame(roomCode, settings);
    }

    sanitizeRoom(room: Room): any {
        // Base Room Data
        const clean: any = {
            code: room.code,
            players: room.players.map(p => ({
                id: p.id,
                playerId: p.playerId,
                name: p.name,
                avatar: p.avatar,
                score: p.score,
                team: p.team,
                isHost: p.isHost,
                hasGuessed: p.hasGuessed
            })),
            teams: room.teams,
            state: room.state,
            currentRound: room.currentRound,
            gameType: room.gameType,
            timeLeft: room.timeLeft,
            videoEnabled: room.videoEnabled,
            teamMode: room.teamMode,
            hardcoreMode: room.hardcoreMode
        };

        // Add Specifics
        if (room.gameType === 'rebus') {
            clean.maskedAnswer = room.maskedAnswer;
            clean.puzzleTimeLimit = room.roundTime;
            clean.puzzleTimeLeft = room.puzzleTimeLeft;
        } else if (room.gameType === 'draw' || room.gameType === 'charades') {
            clean.currentDrawer = room.currentDrawer;
            clean.maskedAnswer = room.maskedAnswer;
            clean.roundTimeLeft = room.roundTimeLeft;
        }

        return clean;
    }
}

// Export a singleton instance if desired, or class
// But original file exported a class.
// However, the original structure:
// module.exports = GameManager; (the class)
// usage: new GameManager(io) in server.js

export default GameManager;
