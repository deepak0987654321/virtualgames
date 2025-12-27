import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import io from 'socket.io-client';
import { ArrowLeft, Settings, Grid } from 'lucide-react';
import { GAMES } from '../../lib/gameConfig';
import GameLobby, { RoomCreationParams } from '../../components/game/GameLobby';

export default function CreateRoom() {
    const router = useRouter();
    const { slug, game } = router.query;
    const { user } = useAuth();
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

    const [categories, setCategories] = useState<string[]>(['Name', 'Place', 'Thing', 'Animal']);
    const [allowedLetters, setAllowedLetters] = useState('ABCDEFGHIJKLMNOPRSTUVW');

    useEffect(() => {
        if (game) setSelectedGameId(game as string);
        else setSelectedGameId(null);
    }, [game]);

    // Categories Config Handlers
    const addCategory = () => { if (categories.length < 8) setCategories([...categories, '']); };
    const removeCategory = (index: number) => { if (categories.length > 2) setCategories(categories.filter((_, i) => i !== index)); };
    const updateCategory = (index: number, val: string) => {
        const newCats = [...categories];
        newCats[index] = val;
        setCategories(newCats);
    };

    const toggleLetter = (char: string) => {
        if (allowedLetters.includes(char)) {
            if (allowedLetters.length > 1) {
                setAllowedLetters(allowedLetters.replace(char, ''));
            }
        } else {
            setAllowedLetters((allowedLetters + char).split('').sort().join(''));
        }
    };

    const handleCreateRoom = (params: RoomCreationParams) => {
        if (!user || !selectedGameId) return;

        const socket = io();
        const foundGame = GAMES.find(g => g.id === selectedGameId);

        const payload: any = {
            name: params.name || `${foundGame?.name} Room`,
            gameType: selectedGameId,
            avatar: params.avatar,
            playerId: user.playerId,
            tenantSlug: slug,
            config: {
                maxPlayers: params.config.maxPlayers,
                roundDuration: params.config.roundTime,
                gameDuration: params.config.gameDuration,
            }
        };

        // Add categories if game is categories
        if (selectedGameId === 'categories') {
            const validCategories = categories.filter(c => c.trim() !== '');
            if (validCategories.length < 2) {
                alert('Please add at least 2 categories');
                return;
            }
            payload.config.categories = validCategories;
            payload.config.allowedLetters = allowedLetters;
        }

        socket.emit('create_room', payload, (response: any) => {
            if (response.success) {
                router.push(`/${slug}/room/${response.roomCode}`);
            } else {
                alert('Failed to create room: ' + response.error);
            }
        });
    };

    // 1. Game Selection View
    if (!selectedGameId) {
        return (
            <div style={{ padding: '40px', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <button
                        onClick={() => router.push(`/${slug}/lobby`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        <ArrowLeft size={20} /> Back to Lobby
                    </button>

                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textAlign: 'center' }}>Choose a Game</h1>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '50px' }}>Select an activity to launch for your team</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                        {GAMES.map(g => (
                            <div
                                key={g.id}
                                onClick={() => router.push(`/${slug}/create-room?game=${g.id}`)}
                                className="game-card"
                            >
                                <div className="game-image">
                                    <img src={g.image} />
                                    <div className="game-overlay" />
                                    <div className="game-icon">
                                        <g.icon size={32} color="white" />
                                    </div>
                                </div>
                                <div className="game-info">
                                    <h3>{g.name}</h3>
                                    <p>{g.desc}</p>
                                    <span className="play-btn">Configure <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <style jsx>{`
                    .game-card {
                        background: var(--bg-panel);
                        border: 1px solid var(--border-subtle);
                        border-radius: 20px;
                        overflow: hidden;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                    }
                    .game-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
                        border-color: var(--accent);
                    }
                    .game-image {
                        height: 180px;
                        position: relative;
                        overflow: hidden;
                    }
                    .game-image img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.5s;
                    }
                    .game-card:hover .game-image img {
                        transform: scale(1.1);
                    }
                    .game-overlay {
                        position: absolute; inset: 0;
                        background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%);
                    }
                    .game-icon {
                        position: absolute;
                        bottom: 15px; left: 15px;
                        background: rgba(255,255,255,0.2);
                        backdrop-filter: blur(5px);
                        padding: 10px;
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.3);
                    }
                    .game-info {
                        padding: 25px;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    .game-info h3 { margin-bottom: 10px; font-size: 1.4rem; font-weight: 700; }
                    .game-info p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; flex: 1; }
                    .play-btn {
                        margin-top: auto;
                        color: var(--accent);
                        font-weight: 600;
                        display: flex; align-items: center; gap: 5px;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                `}</style>
            </div>
        );
    }

    // 2. Specific Game Settings View (Using GameLobby)
    const activeGame = GAMES.find(g => g.id === selectedGameId);
    if (!activeGame) return <div>Game not found</div>; // Should handle 404 better probably

    return (
        <div>
           {/* Back Button Overlay */}
           <div style={{ position: 'fixed', top: 30, left: 30, zIndex: 100 }}>
             <button
                onClick={() => router.back()}
                style={{
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                    width: 40, height: 40, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}
            >
                <ArrowLeft size={20} />
             </button>
           </div>

           <GameLobby
                title={activeGame.name}
                description={activeGame.desc}
                gameType={activeGame.id}
                gradient={activeGame.color}
                rules={activeGame.rules}
                onCreateRoom={handleCreateRoom}
                additionalSettings={selectedGameId === 'categories' ? (
                    <div style={{ textAlign: 'left', marginTop: '10px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    Game Categories ({categories.length}/8)
                                </label>
                                <button onClick={addCategory} disabled={categories.length >= 8} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                    + ADD NEW
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {categories.map((cat, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '5px', position: 'relative' }}>
                                        <input
                                            value={cat}
                                            onChange={(e) => updateCategory(i, e.target.value)}
                                            className="input-field"
                                            placeholder="Category Name"
                                            style={{ padding: '10px', fontSize: '0.9rem', paddingRight: '30px' }}
                                        />
                                        {categories.length > 2 && (
                                            <button
                                                onClick={() => removeCategory(i)}
                                                style={{
                                                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                                    color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'
                                                }}
                                            >×</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Suggestions Bar */}
                        <div style={{ marginTop: '5px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '10px', fontFamily: 'var(--font-heading)' }}>
                                Quick Add Suggestions
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['Food', 'Movies', 'Brand', 'Object', 'Software', 'Country', 'Cartoon', 'Superhero'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            if (categories.includes(tag)) return;
                                            const emptyIdx = categories.findIndex(c => c === '' || c === 'New Category');
                                            if (emptyIdx !== -1) {
                                                updateCategory(emptyIdx, tag);
                                            } else if (categories.length < 8) {
                                                setCategories([...categories, tag]);
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-secondary)',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Allowed Letters Selector */}
                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    Allowed Letters ({allowedLetters.length})
                                </label>
                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Excluded: {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !allowedLetters.includes(l)).join(', ')}</span>
                             </div>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                 {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => {
                                     const isActive = allowedLetters.includes(char);
                                     return (
                                         <button
                                            key={char}
                                            onClick={() => toggleLetter(char)}
                                            style={{
                                                width: '24px', height: '24px', borderRadius: '4px', border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                                background: isActive ? 'var(--accent)' : 'transparent', color: isActive ? 'black' : 'var(--text-muted)',
                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                         >
                                             {char}
                                         </button>
                                     );
                                 })}
                             </div>
                        </div>
                    </div>
                ) : null}
           />
        </div>
    );
}
