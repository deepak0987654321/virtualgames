import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Shuffle, Check, X, Shield, Info, ArrowRight, ArrowLeft } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    team?: 'red' | 'blue';
}

interface TeamSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: { mode: 'auto' | 'manual', teams?: Record<string, 'red' | 'blue'> }) => void;
    players: Player[];
    gameType: 'draw' | 'rebus' | 'charades';
    currentConfig?: any;
}

export default function TeamSettingsModal({ isOpen, onClose, onConfirm, players, gameType, currentConfig }: TeamSettingsModalProps) {
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [manualTeams, setManualTeams] = useState<Record<string, 'red' | 'blue'>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            if (currentConfig && currentConfig.mode) {
                setMode(currentConfig.mode);
                if (currentConfig.teams) {
                    setManualTeams(currentConfig.teams);
                }
            } else {
                // Default init for fresh open: Balanced Auto
                setMode('auto');
                const initialTeams: Record<string, 'red' | 'blue'> = {};
                players.forEach((p, i) => {
                    initialTeams[p.id] = i % 2 === 0 ? 'red' : 'blue';
                });
                setManualTeams(initialTeams);
            }
        }
    }, [isOpen]); // Only on open

    if (!isOpen || !mounted) return null;

    const redPlayers = players.filter(p => manualTeams[p.id] === 'red');
    const bluePlayers = players.filter(p => manualTeams[p.id] === 'blue');
    const unassignedPlayers = players.filter(p => !manualTeams[p.id]);

    const handleSave = () => {
        onConfirm({
            mode,
            teams: mode === 'manual' ? manualTeams : undefined
        });
    };

    const setPlayerTeam = (playerId: string, team: 'red' | 'blue' | null) => {
        setManualTeams(prev => {
            const next = { ...prev };
            if (team) next[playerId] = team;
            else delete next[playerId];
            return next;
        });
    };

    const autoBalance = () => {
        const initialTeams: Record<string, 'red' | 'blue'> = {};
        // Shuffle for randomness
        const shuffled = [...players].sort(() => 0.5 - Math.random());
        shuffled.forEach((p, i) => {
            initialTeams[p.id] = i % 2 === 0 ? 'red' : 'blue';
        });
        setManualTeams(initialTeams);
    };

    return createPortal(
        <div className="overlay-backdrop" style={{ backdropFilter: 'blur(5px)' }}>
            <div className="overlay-card" style={{ maxWidth: 'none', width: 'auto', textAlign: 'left', maxHeight: '95vh', padding: 0, overflow: 'hidden' }}>
                <div className="modal-layout">
                    {/* HEADER */}
                    <div className="modal-header">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <Shield className="text-accent" /> Team Battle Settings
                        </h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                            <X />
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="modal-body">
                        {/* MODE SELECTION */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                            <button
                                onClick={() => { setMode('auto'); autoBalance(); }}
                                style={{
                                    flex: 1, padding: '20px', borderRadius: '12px', cursor: 'pointer',
                                    background: mode === 'auto' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.2))' : 'rgba(255,255,255,0.03)',
                                    border: mode === 'auto' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                    textAlign: 'center', color: 'white', transition: 'all 0.2s',
                                    boxShadow: mode === 'auto' ? '0 4px 15px rgba(139, 92, 246, 0.2)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><Shuffle size={24} /></div>
                                <strong style={{ fontSize: '1.1rem' }}>Auto Assign</strong>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '4px' }}>Evenly balanced</div>
                            </button>
                            <button
                                onClick={() => setMode('manual')}
                                style={{
                                    flex: 1, padding: '20px', borderRadius: '12px', cursor: 'pointer',
                                    background: mode === 'manual' ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.4), rgba(34, 211, 238, 0.2))' : 'rgba(255,255,255,0.03)',
                                    border: mode === 'manual' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                    textAlign: 'center', color: 'white', transition: 'all 0.2s',
                                    boxShadow: mode === 'manual' ? '0 4px 15px rgba(34, 211, 238, 0.2)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><Users size={24} /></div>
                                <strong style={{ fontSize: '1.1rem' }}>Manual Setup</strong>
                                <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '4px' }}>Drag & Drop Assignment</div>
                            </button>
                        </div>

                        {/* EDITOR AREA */}
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            {mode === 'manual' ? (
                                <div className="team-settings-grid">
                                    {/* RED TEAM */}
                                    <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                        <h4 style={{ color: '#ef4444', textAlign: 'center', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1.3rem' }}>
                                            🔴 Red ({redPlayers.length})
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                                            {redPlayers.map(p => (
                                                <div key={p.id}
                                                    onClick={() => setPlayerTeam(p.id, null)}
                                                    style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}
                                                >
                                                    <span style={{ fontWeight: 600 }}>{p.name}</span> <X size={18} style={{ opacity: 0.7 }} />
                                                </div>
                                            ))}
                                            {redPlayers.length === 0 && <div style={{ textAlign: 'center', opacity: 0.4, marginTop: '20px', fontStyle: 'italic' }}>No players</div>}
                                        </div>
                                    </div>

                                    {/* UNASSIGNED */}
                                    <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column' }}>
                                        <h4 style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '15px', fontSize: '1.3rem' }}>
                                            Unassigned ({unassignedPlayers.length})
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                                            {unassignedPlayers.length === 0 && (
                                                <div style={{ textAlign: 'center', color: 'var(--success)', marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Check size={40} style={{ marginBottom: '10px' }} />
                                                    <div>All players assigned!</div>
                                                </div>
                                            )}
                                            {unassignedPlayers.map(p => (
                                                <div key={p.id} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                                    <button
                                                        onClick={() => setPlayerTeam(p.id, 'red')}
                                                        style={{ padding: '0 20px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', fontSize: '1.2rem', transition: 'all 0.2s' }}
                                                        title="Assign to Red"
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                    >
                                                        🔴
                                                    </button>
                                                    <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {p.name}
                                                    </div>
                                                    <button
                                                        onClick={() => setPlayerTeam(p.id, 'blue')}
                                                        style={{ padding: '0 20px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', cursor: 'pointer', color: '#3b82f6', fontSize: '1.2rem', transition: 'all 0.2s' }}
                                                        title="Assign to Blue"
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                                    >
                                                        🔵
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* BLUE TEAM */}
                                    <div className="glass-panel" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.3)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                        <h4 style={{ color: '#3b82f6', textAlign: 'center', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1.3rem' }}>
                                            🔵 Blue ({bluePlayers.length})
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                                            {bluePlayers.map(p => (
                                                <div key={p.id}
                                                    onClick={() => setPlayerTeam(p.id, null)}
                                                    style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}
                                                >
                                                    <X size={18} style={{ opacity: 0.7 }} /> <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                </div>
                                            ))}
                                            {bluePlayers.length === 0 && <div style={{ textAlign: 'center', opacity: 0.4, marginTop: '20px', fontStyle: 'italic' }}>No players</div>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '50%', marginBottom: '20px' }}>
                                        <Shuffle size={64} color="var(--primary)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: 'white' }}>Automated Team Balancing</h3>
                                    <p style={{ fontSize: '1.1rem', marginBottom: '20px', maxWidth: '400px' }}>
                                        The game will automatically split all players into Red and Blue teams to ensure a fair match.
                                    </p>
                                    <div className="badge" style={{ fontSize: '1.1rem', padding: '10px 20px' }}>
                                        Red: {redPlayers.length} vs Blue: {bluePlayers.length}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="modal-footer">
                        {/* RULES */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px 20px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)', minWidth: '200px' }}>
                                <Info size={20} />
                                <strong style={{ fontSize: '1.1rem' }}>
                                    {gameType === 'draw' ? 'Draw & Guess' : (gameType === 'charades' ? 'Video Charades' : 'Word Guess')}
                                </strong>
                             </div>

                             <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>

                             {gameType === 'draw' || gameType === 'charades' ? (
                                 <div style={{ display: 'flex', gap: '30px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                                    <div>⚡ <strong>{gameType === 'draw' ? "Drawer's" : "Actor's"} Team</strong> guesses only</div>
                                    <div>🏆 Points shared by entire team</div>
                                 </div>
                             ) : (
                                 <div style={{ display: 'flex', gap: '30px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                                     <div>⚡ <strong>First Team</strong> to solve wins</div>
                                     <div>🏆 Speed is everything</div>
                                 </div>
                             )}
                        </div>

                        {/* BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '5px' }}>
                            <button onClick={onClose} style={{ padding: '16px 30px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Check size={20} />
                                Confirm & Play
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
