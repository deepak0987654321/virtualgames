import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { Trophy, Clock, Play, AlertCircle, Plus, X, Hand, Check, ThumbsUp, ThumbsDown, Gamepad2, Users, Send, Info } from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import GameLayout from '../../../../components/game/GameLayout';
import JoinGameOverlay from '../../../../components/game/JoinGameOverlay';
import { useWebRTC } from '../../../../hooks/useWebRTC';

let socket: any;

export default function TenantCategoriesRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const { roomCode, sessionId, name, audioOn, videoOn, slug } = router.query;

    // Auto-Login if Authenticated
    useEffect(() => {
        if (!router.isReady) return;
        if (!name && user) {
            const myAvatar = user.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`;
            router.replace({
                pathname: router.pathname,
                query: {
                    ...router.query,
                    name: user.username,
                    avatar: myAvatar,
                    playerId: user.id || user.playerId // Support both id and playerId from useAuth
                }
            });
        }
    }, [router.isReady, name, user]);

    // Core Game State
    const [room, setRoom] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);

    // Categories Game State
    const [categories, setCategories] = useState<string[]>([]);
    const [totalRounds, setTotalRounds] = useState(0);
    const [roundDuration, setRoundDuration] = useState(60);
    const [allowedLetters, setAllowedLetters] = useState('ABCDEFGHIJKLMNOPRSTUVW');
    const [currentRound, setCurrentRound] = useState(0);
    const [currentLetter, setCurrentLetter] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [overallTimeLeft, setOverallTimeLeft] = useState(0);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'reviewing' | 'finished'>('waiting');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId as string || null);

    // Gameplay State
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [roundAnswers, setRoundAnswers] = useState<any[]>([]);
    const [roundScores, setRoundScores] = useState<any[]>([]);
    const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);
    const [votes, setVotes] = useState<Record<string, 'valid' | 'invalid' | 'shared'>>({}); // answerId -> voteType
    const [stoppingPlayer, setStoppingPlayer] = useState<string | null>(null);

    // UI/Media State
    const [viewMode, setViewMode] = useState<'game' | 'camera'>('game');
    const [activeTab, setActiveTab] = useState<'players' | 'cameras' | 'chat' | null>('players');
    const [videoEnabledSetting, setVideoEnabledSetting] = useState(false);
    const [socketInstance, setSocketInstance] = useState<any>(null);
    const [roundCounter, setRoundCounter] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const {
        localStream,
        peers,
        toggleVideo,
        toggleAudio,
        isVideoEnabled,
        isAudioEnabled,
        switchDevice
    } = useWebRTC(
        socketInstance,
        roomCode as string,
        name as string,
        videoOn === 'true',
        audioOn === 'true'
    );

    useEffect(() => {
        if (!router.isReady || !name || !roomCode) return;

        if (socket && socket.connected) return;

        socket = io();
        setSocketInstance(socket);

        const { avatar, playerId } = router.query;

        socket.emit('join_room', { name, roomCode, avatar, playerId }, (response: any) => {
            if (response.success) {
                setRoom(response.room);
                setVideoEnabledSetting(response.room.videoEnabled || false);
            } else {
                router.push(`/${slug}/lobby`);
            }
        });

        const fetchSession = async () => {
            try {
                const res = await fetch(`/api/categories/room/${roomCode}`);
                const data = await res.json();
                if (data && !data.error) {
                    setCategories(data.categories);
                    setTotalRounds(data.totalRounds);
                    setRoundDuration(data.roundDuration);
                    setGameStatus(data.status);
                    if (data.allowedLetters) setAllowedLetters(data.allowedLetters);
                    if (data.allowedLetters) setAllowedLetters(data.allowedLetters);
                    setCurrentRound(data.currentRound);
                    setCurrentSessionId(data.sessionId);
                    if (data.currentLetter) setCurrentLetter(data.currentLetter);
                    if (data.overallTimeLeft !== undefined) setOverallTimeLeft(data.overallTimeLeft);
                }
            } catch (err) { console.error(err); }
        };
        fetchSession();

        socket.on('update_room', (updatedRoom: any) => {
            setRoom(updatedRoom);
        });

        socket.on('chat_message', (msg: any) => setMessages(prev => [...prev, msg]));

        // --- Categories Events ---
        socket.on('categories:session_created', ({ sessionId: sId, categories: cats, totalRounds: rounds, roundDuration: duration, allowedLetters: letters }: any) => {
            setCurrentSessionId(sId);
            setCategories(cats);
            setTotalRounds(rounds);
            setRoundDuration(duration);
            if (letters) setAllowedLetters(letters);
            setGameStatus('waiting');
        });

        socket.on('categories:config_updated', (config: any) => {
            setCategories(config.categories);
            setTotalRounds(config.totalRounds);
            setRoundDuration(config.roundDuration);
            if (config.allowedLetters) setAllowedLetters(config.allowedLetters);
        });

        socket.on('categories:round_started', ({ letter, roundNumber, duration, overallTimeLeft }: any) => {
            setCurrentLetter(letter);
            setCurrentRound(roundNumber);
            setTimeLeft(duration);
            if (overallTimeLeft !== undefined) setOverallTimeLeft(overallTimeLeft);
            setIsRoundActive(true);
            setGameStatus('active');
            setAnswers({});
            setRoundCounter(prev => prev + 1);
            setStoppingPlayer(null);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        });

        socket.on('categories:timer_update', ({ timeLeft }: any) => {
            setOverallTimeLeft(timeLeft);
        });

        socket.on('categories:answer_phase_ended', ({ stoppedBy }: any) => {
            setIsRoundActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeLeft(0);
            if (stoppedBy) {
                setStoppingPlayer(stoppedBy);
            }
        });

        socket.on('categories:review_started', ({ answers }: any) => {
            setRoundAnswers(answers);
            setGameStatus('reviewing');
            setVotes({});
        });

        socket.on('categories:vote_updated', ({ targetPlayerId, category, voteType }: any) => {
             // Optional: Sync UI counts for everyone
        });

        socket.on('categories:round_ended', ({ scores, answers }: any) => {
            setRoundScores(scores);
            setRoundAnswers(answers);
            setGameStatus('waiting');
        });

        socket.on('categories:game_ended', ({ leaderboard }: any) => {
            setFinalLeaderboard(leaderboard);
            setGameStatus('finished');
        });

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            socket.disconnect();
            socket = null;
        };
    }, [router.isReady, name, roomCode]);

    // Handlers
    const updateCategories = (newCats: string[], newLetters?: string) => {
        if (!socket || !currentSessionId) return;
        socket.emit('categories:update_config', {
            sessionId: currentSessionId,
            roomCode,
            config: {
                categories: newCats,
                totalRounds,
                roundDuration,
                allowedLetters: newLetters !== undefined ? newLetters : allowedLetters
            }
        });
    };

    const addCategory = () => {
        if (categories.length < 8) updateCategories([...categories, 'New Category']);
    };

    const removeCategory = (idx: number) => {
        if (categories.length > 1) updateCategories(categories.filter((_, i) => i !== idx));
    };

    const editCategory = (idx: number, val: string) => {
        const n = [...categories];
        n[idx] = val;
        updateCategories(n);
    };

    const toggleLetter = (char: string) => {
        let nextLetters = '';
        if (allowedLetters.includes(char)) {
            nextLetters = allowedLetters.replace(char, '');
        } else {
            nextLetters = (allowedLetters + char).split('').sort().join('');
        }
        if (nextLetters.length === 0) return; // Must have at least one
        setAllowedLetters(nextLetters);
        updateCategories(categories, nextLetters);
    };

    const handleAnswerChange = (cat: string, val: string) => {
        setAnswers(prev => ({ ...prev, [cat]: val }));
    };

    const submitAnswer = (cat: string) => {
        if (!currentSessionId) return;
        socket.emit('categories:submit_answer', {
            sessionId: currentSessionId,
            playerId: router.query.playerId,
            category: cat,
            answer: answers[cat] || ''
        });
    };

    const handleStop = () => {
        if (!currentSessionId) return;
        socket.emit('categories:stop_round', { sessionId: currentSessionId, roomCode, roundNumber: currentRound });
    };

    const handleVote = (ans: any, voteType: 'valid' | 'invalid' | 'shared') => {
        if (!currentSessionId) return;
        const id = `${ans.player_id}_${ans.category_name}`;
        setVotes(prev => ({ ...prev, [id]: voteType }));
        socket.emit('categories:submit_vote', {
            sessionId: currentSessionId,
            roomCode,
            roundNumber: currentRound,
            targetPlayerId: ans.player_id,
            category: ans.category_name,
            voteType
        });
    };

    const finalizeReview = () => {
        if (!currentSessionId) return;
        socket.emit('categories:finalize_round', { sessionId: currentSessionId, roomCode, roundNumber: currentRound });
    };

    if (!router.isReady) return <div className="loading-screen"><h3>Initializing...</h3></div>;
    if (!name) return <JoinGameOverlay roomCode={roomCode as string} onJoin={(n, a, au, vi, p) => router.replace({ pathname: router.pathname, query: { ...router.query, name: n, avatar: a, playerId: p, audioOn: String(au), videoOn: String(vi) }})} />;
    if (!room) return <div className="loading-screen"><h3>Syncing Game State...</h3></div>;

    const isHost = room.players.find((p: any) => p.name === name || (p.playerId && p.playerId === router.query.playerId))?.isHost;
    const allFilled = categories.every(cat => answers[cat] && answers[cat].trim().length > 0);

    return (
        <GameLayout
            roomCode={roomCode as string}
            timeLeft={overallTimeLeft}
            headerCenter={
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="game-status-badge">
                        {gameStatus === 'waiting' && <span className="badge">Lobby - {categories.length} Categories</span>}
                        {gameStatus === 'active' && <span className="badge badge-primary">Round {currentRound} / {totalRounds}</span>}
                        {gameStatus === 'reviewing' && <span className="badge badge-warning">Reviewing Answers</span>}
                        {gameStatus === 'finished' && <span className="badge badge-success">Final Standings</span>}
                    </div>
                    {isRoundActive && (
                        <div className="stat-pill accent" style={{ background: 'var(--primary)', color: 'white' }}>
                            <Clock size={16} />
                            <span>{timeLeft}s</span>
                        </div>
                    )}
                </div>
            }
            viewMode={viewMode} setViewMode={setViewMode}
            activeTab={activeTab} setActiveTab={setActiveTab}
            players={room.players} myId={socket?.id}
            messages={messages} onSendMessage={(m) => socket.emit('send_chat', { roomCode, message: m })}
            mediaActive={videoEnabledSetting}
            isAudioEnabled={isAudioEnabled} toggleAudio={toggleAudio}
            isVideoEnabled={isVideoEnabled} toggleVideo={toggleVideo}
            GameSettingsComponent={
                <div style={{ padding: '15px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '10px' }}>Game Info</h4>
                    <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div>Rounds: {totalRounds}</div>
                        <div>Duration: {roundDuration}s</div>
                        <div style={{ opacity: 0.5 }}>Current: Round {currentRound}</div>
                    </div>
                </div>
            }
            renderVideo={(props) => (
                <div style={{ padding: '10px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Video Feeds Placeholder
                </div>
            )}
        >
            <div className="categories-arena container-fluid" style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>

                {/* 1. LOBBY STATE */}
                {gameStatus === 'waiting' && (
                    <div className="lobby-phase animate-fade-in">
                        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <Gamepad2 size={48} className="text-accent" style={{ marginBottom: '15px' }} />
                                <h1>{currentRound > 0 ? "Next Round" : "Game Lobby"}</h1>
                                <p className="text-secondary">
                                    {isHost ? "You are the host. Get ready to launch the round!" : "Wait for the host to start the game."}
                                </p>
                            </div>

                            <div className="rules-section glass-panel-sm" style={{ marginBottom: '40px', padding: '30px', borderLeft: '4px solid var(--accent)', background: 'rgba(255,255,255,0.03)' }}>
                                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                                    <Info size={20} /> How to Play
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '1.05rem', textAlign: 'left' }}>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>•</span> A random letter is chosen each round.</li>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>•</span> Fill answers starting with that letter for each category.</li>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>•</span> <strong>Scoring:</strong> 10 points for unique, 5 for shared answers.</li>
                                    <li style={{ display: 'flex', paddingLeft: '20px', fontSize: '0.9rem', opacity: 0.8 }}>- Unique: You are the only one with that answer (10 pts)</li>
                                    <li style={{ display: 'flex', paddingLeft: '20px', fontSize: '0.9rem', opacity: 0.8 }}>- Shared: Others have the same answer or marked as shared (5 pts)</li>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>•</span> All players vote on validity after the round!</li>
                                </ul>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                                {isHost ? (
                                    <button onClick={() => currentSessionId && socket.emit('categories:start_round', { sessionId: currentSessionId, roomCode })} className="btn-primary btn-lg">
                                        <Play size={22} style={{ marginRight: '10px' }} /> {currentRound > 0 ? 'Start Next Round' : 'Launch Game'}
                                    </button>
                                ) : (
                                    <div className="waiting-pill animate-pulse">
                                        <Users size={18} /> Waiting for host to start...
                                    </div>
                                )}
                            </div>

                            {roundScores.length > 0 && (
                                <div style={{ marginTop: '50px' }}>
                                    <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Last Round Ranking</h3>
                                    <div className="mini-leaderboard">
                                        {roundScores.slice(0, 3).map((s, i) => (
                                            <div key={i} className="leader-item glass-panel-sm">
                                                <span>#{i+1} {s.username}</span>
                                                <span className="text-accent">{s.totalPoints} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. ACTIVE GAME STATE */}
                {gameStatus === 'active' && (
                    <div className="active-phase animate-slide-up">
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <div className="letter-orb animate-pulse-light">{currentLetter}</div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '20px' }}>Letter is <span className="text-accent">{currentLetter}</span></h2>
                        </div>

                        <div className="categories-grid" style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                            {categories.map((cat, i) => (
                                <div key={i} className="category-field glass-panel">
                                    <label>{cat}</label>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            placeholder={`${cat} starting with ${currentLetter}...`}
                                            className="game-input"
                                            value={answers[cat] || ''}
                                            onChange={(e) => handleAnswerChange(cat, e.target.value)}
                                            onBlur={() => submitAnswer(cat)}
                                            autoFocus={i === 0}
                                        />
                                        <div className="input-status">
                                            {answers[cat] && answers[cat].trim().length > 0 ? <Check size={18} color="var(--success)" /> : <Clock size={16} opacity={0.3} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '50px' }}>
                            <button
                                className={`stop-button ${allFilled ? 'active' : 'disabled'}`}
                                onClick={allFilled ? handleStop : undefined}
                            >
                                <Hand size={32} />
                                <span>STOP!</span>
                            </button>
                            <p style={{ marginTop: '15px', color: allFilled ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                {allFilled ? "Press STOP now to end the round!" : "Fill all categories to enable STOP"}
                            </p>
                        </div>
                    </div>
                )}

                {/* 3. REVIEW PHASE */}
                {gameStatus === 'reviewing' && (
                    <div className="review-phase animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="review-header glass-panel" style={{ textAlign: 'center', marginBottom: '30px', padding: '20px' }}>
                             {stoppingPlayer && (
                                 <div className="stop-alert">
                                     <Hand size={24} className="text-error" />
                                     <span><strong>{room.players.find((p:any) => p.playerId === stoppingPlayer || p.socketId === stoppingPlayer)?.name || 'Someone'}</strong> pressed STOP!</span>
                                 </div>
                             )}
                             <h2>Validate Answers</h2>
                             <p className="text-secondary">Vote Thumbs Down for invalid words (e.g. wrong letter or fake words).</p>
                        </div>

                        <div className="review-list">
                            {categories.map(cat => {
                                const catAns = roundAnswers.filter(a => a.category_name === cat);
                                return (
                                    <div key={cat} className="review-category-group glass-panel" style={{ marginBottom: '25px', padding: '25px' }}>
                                        <h3 className="category-title text-accent">{cat}</h3>
                                        <div className="answers-grid" style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
                                            {catAns.length === 0 ? <p className="text-secondary italic">No one found an answer.</p> : catAns.map((ans, idx) => {
                                                const id = `${ans.player_id}_${ans.category_name}`;
                                                const isMyAns = ans.player_id === router.query.playerId;
                                                const startsWithLetter = (ans.answer || "")[0]?.toUpperCase() === currentLetter;

                                                return (
                                                    <div key={idx} className={`review-row ${!startsWithLetter ? 'invalid-start' : ''}`}>
                                                        <div className="user-info">
                                                            <img src={ans.avatar} className="avatar-sm" />
                                                            <span className="username">{ans.username}</span>
                                                        </div>
                                                        <div className="answer-text">
                                                            <span>{ans.answer || <em className="text-subtle">Empty</em>}</span>
                                                            {!startsWithLetter && <span className="error-tag">Wrong Letter</span>}
                                                        </div>
                                                        <div className="vote-actions">
                                                            {!isMyAns && (
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button
                                                                        onClick={() => handleVote(ans, 'valid')}
                                                                        className={`vote-btn valid ${votes[id] === 'valid' ? 'active' : ''}`}
                                                                        title="Mark as Valid"
                                                                    ><ThumbsUp size={16} /></button>
                                                                    <button
                                                                        onClick={() => handleVote(ans, 'shared')}
                                                                        className={`vote-btn shared ${votes[id] === 'shared' ? 'active' : ''}`}
                                                                        title="Mark as Shared"
                                                                    ><Users size={16} /></button>
                                                                    <button
                                                                        onClick={() => handleVote(ans, 'invalid')}
                                                                        className={`vote-btn invalid ${votes[id] === 'invalid' ? 'active' : ''}`}
                                                                        title="Mark as Invalid"
                                                                    ><ThumbsDown size={16} /></button>
                                                                </div>
                                                            )}
                                                            {isMyAns && <span className="badge-sm">Your Answer</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ textAlign: 'center', margin: '40px 0' }}>
                            {isHost ? (
                                <button onClick={finalizeReview} className="btn-primary btn-lg">
                                    <Check size={20} style={{ marginRight: '10px' }} /> Finalize & Show Results
                                </button>
                            ) : (
                                <div className="waiting-pill"><Users size={16} /> Host will finalize shortly...</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. FINAL STANDINGS */}
                {gameStatus === 'finished' && (
                    <div className="leaderboard-phase animate-slide-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
                            <Trophy size={80} className="text-accent" style={{ marginBottom: '20px' }} />
                            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Champions!</h1>
                            <p className="text-secondary" style={{ marginBottom: '40px' }}>Final results for {totalRounds} rounds of Categories.</p>

                            <div className="leaderboard-list">
                                {finalLeaderboard.map((p, i) => (
                                    <div key={i} className={`ranking-item ${i === 0 ? 'winner' : ''} glass-panel-sm animate-pop`} style={{ animationDelay: `${i*0.1}s` }}>
                                        <div className="rank">#{i+1}</div>
                                        <img src={p.avatar} className="avatar-md" />
                                        <div className="name-group">
                                            <span className="name">{p.username}</span>
                                            <span className="tag">@{p.username.toLowerCase().split(' ')[0]}</span>
                                        </div>
                                        <div className="score text-accent">{p.totalScore} <small>pts</small></div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => router.push(`/${slug}/lobby`)} className="btn-ghost btn-lg" style={{ marginTop: '40px', width: '100%' }}>
                                Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg-dark); }
                .game-status-badge { margin-top: 5px; }
                .letter-orb {
                    width: 120px; height: 120px; background: var(--bg-gradient);
                    border-radius: 30px; display: inline-flex; align-items: center;
                    justify-content: center; font-size: 5rem; font-weight: 900;
                    color: white; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .category-field { padding: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--border-subtle); border-radius: 16px; }
                .category-field label { font-size: 0.95rem; fontWeight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.8px; }
                .input-group { position: relative; display: flex; align-items: center; }
                .game-input {
                    width: 100%; padding: 14px 20px; border-radius: 10px;
                    background: rgba(255,255,255,0.03); border: 2px solid var(--border-subtle);
                    font-size: 1.1rem; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .game-input:focus { outline: none; border-color: var(--accent); background: rgba(219, 253, 96, 0.05); }
                .input-status { position: absolute; right: 15px; }

                .stop-button {
                    width: 140px; height: 140px; border-radius: 50%; border: none;
                    display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 10px; font-weight: 800; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .stop-button.active { background: #ef4444; color: white; cursor: pointer; box-shadow: 0 0 40px rgba(239, 68, 68, 0.4); }
                .stop-button.disabled { background: #1e1e2d; color: #444; cursor: not-allowed; opacity: 0.5; }
                .stop-button.active:hover { transform: scale(1.1) rotate(-5deg); filter: brightness(1.1); }
                .stop-button.active:active { transform: scale(0.95); }

                .review-row {
                    display: flex; align-items: center; padding: 15px 20px;
                    background: rgba(255,255,255,0.02); border-radius: 10px; gap: 20px;
                    border-left: 4px solid transparent; transition: all 0.2s;
                }
                .review-row.invalid-start { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
                .user-info { display: flex; align-items: center; gap: 10px; min-width: 180px; }
                .avatar-sm { width: 32px; height: 32px; border-radius: 50%; }
                .username { font-weight: 600; font-size: 0.95rem; }
                .answer-text { flex: 1; font-size: 1.1rem; display: flex; align-items: center; gap: 15px; }
                .error-tag { font-size: 0.75rem; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; }
                .vote-actions { display: flex; gap: 10px; align-items: center; }
                .vote-btn {
                    width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--border-subtle);
                    background: none; color: var(--text-secondary); cursor: pointer; display: flex;
                    align-items: center; justify-content: center; transition: all 0.2s;
                }
                .vote-btn.valid.active { background: #10b981; color: white; border-color: #10b981; }
                .vote-btn.shared.active { background: #3b82f6; color: white; border-color: #3b82f6; }
                .vote-btn.invalid.active { background: #ef4444; color: white; border-color: #ef4444; }
                .vote-btn:hover:not(.active) { background: rgba(255,255,255,0.05); border-color: var(--text-secondary); }

                .category-input-wrap { position: relative; padding: 15px; }
                .minimal-input { background: none; border: none; color: white; font-weight: 600; width: 100%; font-size: 1rem; }
                .minimal-input:focus { outline: none; border-bottom: 2px solid var(--accent); }
                .remove-cat-btn { position: absolute; right: 5px; top: 5px; background: none; border: none; color: #666; cursor: pointer; }
                .add-cat-btn { border: 2px dashed var(--border-subtle); color: var(--text-secondary); font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .add-cat-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(219, 253, 96, 0.05); }

                .ranking-item {
                    display: flex; align-items: center; gap: 20px; padding: 20px;
                    margin-bottom: 15px; background: rgba(255,255,255,0.03);
                }
                .ranking-item.winner { border: 2px solid var(--accent); background: linear-gradient(90deg, rgba(219, 253, 96, 0.1), transparent); }
                .rank { font-size: 1.5rem; fontWeight: 900; width: 40px; }
                .name-group { flex: 1; text-align: left; display: flex; flex-direction: column; }
                .name { font-size: 1.2rem; fontWeight: 700; }
                .tag { font-size: 0.8rem; opacity: 0.5; }
                .score { font-size: 1.5rem; fontWeight: 800; }
                .avatar-md { width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--border-subtle); }

                .stop-alert {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 10px;
                    border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </GameLayout>
    );
}
