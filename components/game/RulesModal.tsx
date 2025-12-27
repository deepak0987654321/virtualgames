import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface RulesModalProps {
    game: any;
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
    onPlay: () => void;
    userRole?: string;
}

export default function RulesModal({ game, isOpen, onClose, isAdmin, onPlay, userRole }: RulesModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !game || !mounted) return null;

    const displayRole = userRole || (isAdmin ? 'Host' : 'Player');

    return createPortal(
        <div className="overlay-backdrop" onClick={onClose}>
            <div
                className="overlay-card"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '500px',
                    maxHeight: 'min(700px, 90vh)',
                    width: '90%',
                    padding: 0,
                    overflow: 'hidden',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div className="modal-layout">

                    {/* Hero Banner Header */}
                    <div style={{ height: '160px', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '24px', flexShrink: 0 }}>
                        <img
                            src={game.image}
                            alt={game.name}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-card) 40%, rgba(0,0,0,0.4) 100%)' }} />

                        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: isAdmin ? 'rgba(219, 253, 96, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${isAdmin ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)'}`,
                                color: isAdmin ? 'var(--accent)' : 'white',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                {isAdmin ? <ShieldCheck size={12} /> : <User size={12} />}
                                {displayRole} View
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', zIndex: 10
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px' }}>
                             <div style={{
                                 width: '50px', height: '50px',
                                 background: 'var(--bg-surface-secondary)',
                                 borderRadius: '12px',
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 border: '1px solid var(--border-subtle)',
                                 boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                             }}>
                                 <game.icon size={28} color="var(--accent)" />
                             </div>
                             <div>
                                 <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{game.name}</h2>
                                 <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                                    Game Briefing
                                 </span>
                             </div>
                        </div>
                    </div>

                    <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>The Premise</h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '0' }}>
                                {game.howToPlay}
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                             <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Core Mechanics</h3>
                             <div style={{
                                background: 'var(--bg-surface-secondary)',
                                borderRadius: '16px',
                                padding: '20px',
                                display: 'flex', flexDirection: 'column', gap: '12px',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                {game.rules?.map((rule: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                        <CheckCircle2 size={16} color="var(--accent)" style={{ minWidth: 16, marginTop: 2 }} />
                                        <span>{rule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {game.features && (
                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Key Highlights</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {game.features.map((f: string) => (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
                        {isAdmin ? (
                            <div style={{ width: '100%' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
                                    You have control over this session.
                                </p>
                                <button
                                    className="btn-primary"
                                    onClick={onPlay}
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    Launch Game Session <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '12px',
                                border: '1px dashed var(--border-subtle)',
                                width: '100%'
                            }}>
                                <p style={{ marginBottom: '8px', fontWeight: 600, color: 'white' }}>Waiting for the Host</p>
                                <p style={{ fontSize: '0.8rem', margin: 0 }}>Only administrators can start a new game session in this workspace.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
