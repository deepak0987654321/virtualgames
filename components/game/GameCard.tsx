import React from 'react';
import { BookOpen, Play, Lock, ArrowRight, Gamepad2 } from 'lucide-react';

interface GameCardProps {
    game: {
        id: string;
        name: string;
        desc: string;
        tagline: string;
        image: string;
        color: string;
        icon: any;
    };
    isAdmin: boolean;
    onPlay: () => void;
    onViewRules: (e: React.MouseEvent) => void;
    layoutType?: 'landing' | 'lobby' | 'library';
}

export default function GameCard({ game, isAdmin, onPlay, onViewRules, layoutType = 'lobby' }: GameCardProps) {
    const isLanding = layoutType === 'landing';

    return (
        <div className="game-card-premium">
            <div className="card-image-wrap">
                <img src={game.image} alt={game.name} />
                <div className="card-image-overlay" />
                <div className="card-icon-badge">
                    <game.icon size={24} color={game.color} />
                </div>
            </div>

            <div className="card-body-premium">
                <span className="card-tag-premium" style={{ color: game.color }}>{game.tagline}</span>
                <h3>{game.name}</h3>
                <p>{game.desc}</p>
            </div>

            <div className="card-footer-premium">
                <button
                    className="btn-ghost"
                    onClick={onViewRules}
                    style={{ padding: '12px', flex: isLanding ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <BookOpen size={18} style={{ marginRight: 8 }} /> Rules
                </button>

                {isLanding ? (
                    <button className="btn-primary" onClick={onPlay} style={{ flex: 1.2 }}>
                        Try Demo <Gamepad2 size={18} style={{ marginLeft: 8 }} />
                    </button>
                ) : isAdmin ? (
                    <button className="btn-primary" onClick={onPlay} style={{ flex: 1 }}>
                        Play <Play size={16} fill="currentColor" style={{ marginLeft: 8 }} />
                    </button>
                ) : (
                    <button className="btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed', flex: 1 }}>
                        <Lock size={16} style={{ marginRight: 8 }} /> Host Only
                    </button>
                )}
            </div>
        </div>
    );
}
