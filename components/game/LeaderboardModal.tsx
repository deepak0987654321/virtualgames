import React, { useEffect, useState } from 'react';
import { X, Trophy, Crown } from 'lucide-react';

interface LeaderboardModalProps {
    slug: string;
    onClose: () => void;
}

export default function LeaderboardModal({ slug, onClose }: LeaderboardModalProps) {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/tenant/${slug}/leaderboard`)
            .then(res => res.json())
            .then(data => {
                setPlayers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [slug]);

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ width: '500px', maxWidth: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy color="#fbbf24" size={24} />
                        <h2 style={{ fontSize: '1.4rem' }}>Leaderboard</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* List */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', opacity: 0.7 }}>Loading scores...</div>
                    ) : players.length === 0 ? (
                        <div style={{ textAlign: 'center', opacity: 0.5 }}>No games played yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {players.map((p, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px',
                                    background: idx < 3 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    border: idx === 0 ? '1px solid rgba(251, 191, 36, 0.4)' : 'none'
                                }}>
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: idx < 3 ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                                        fontSize: '1.2rem'
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <img src={p.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {p.username}
                                            {idx === 0 && <Crown size={14} color="#fbbf24" style={{ fill: "#fbbf24" }} />}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.games_played} Games Played</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>{p.total_score}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Points</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
