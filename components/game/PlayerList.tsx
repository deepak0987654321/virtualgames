import React from 'react';
import { Crown, Pencil, CheckCircle, CircleHelp } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    avatar?: string;
    score: number;
    isHost: boolean;
    hasGuessed?: boolean;
    playerId?: string;
    socketId?: string; // Sometimes used, prefer id
    team?: 'red' | 'blue';
}

interface PlayerListProps {
    players: Player[];
    currentDrawerId?: string;
    myId?: string; // To highlight 'me' (can be socketId)
    myPlayerId?: string; // Persistent ID
}

export default function PlayerList({ players, currentDrawerId, myId, myPlayerId }: PlayerListProps) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const hasTeams = players.some(p => p.team);
    const reds = sorted.filter(p => p.team === 'red');
    const blues = sorted.filter(p => p.team === 'blue');
    const noTeam = sorted.filter(p => !p.team);

    if (hasTeams) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
                {reds.length > 0 && (
                     <div>
                         <h4 style={{ color: '#ef4444', marginBottom: '8px', borderBottom: '1px solid rgba(239,68,68,0.3)', paddingBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                             <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                             Red Team
                         </h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {reds.map(p => renderPlayerCard(p, currentDrawerId, myId, myPlayerId))}
                         </div>
                     </div>
                )}
                {blues.length > 0 && (
                     <div>
                         <h4 style={{ color: '#3b82f6', marginBottom: '8px', borderBottom: '1px solid rgba(59,130,246,0.3)', paddingBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                             <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                             Blue Team
                         </h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {blues.map(p => renderPlayerCard(p, currentDrawerId, myId, myPlayerId))}
                         </div>
                     </div>
                )}
                 {noTeam.length > 0 && (
                     <div>
                         <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Spectators</h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {noTeam.map(p => renderPlayerCard(p, currentDrawerId, myId, myPlayerId))}
                         </div>
                     </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {sorted.map(p => renderPlayerCard(p, currentDrawerId, myId, myPlayerId))}
        </div>
    );
}

function renderPlayerCard(p: Player, currentDrawerId?: string, myId?: string, myPlayerId?: string) {
    const isDrawing = currentDrawerId && p.id === currentDrawerId;
    const isMe = (myPlayerId && p.playerId === myPlayerId) || (myId && (p.id === myId || p.socketId === myId));
    const teamColor = p.team === 'red' ? '#ef4444' : (p.team === 'blue' ? '#3b82f6' : null);

    return (
        <div key={p.id} style={{
            padding: '10px',
            background: p.hasGuessed ? 'rgba(34, 197, 94, 0.2)' : (isDrawing ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.05)'),
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: isDrawing ? '1px solid var(--accent)' : (isMe ? '1px solid rgba(255,255,255,0.3)' : 'none'),
            borderLeft: teamColor ? `4px solid ${teamColor}` : undefined,
            transition: 'all 0.3s'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={p.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${p.name}`} style={{ width: 32, height: 32, borderRadius: '50%', background: 'white' }} />
                <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.name}
                        {p.isHost && <Crown size={14} color="#eab308" fill="#eab308" />}
                        {isMe && <span style={{ fontSize: '0.7em', background: 'rgba(255,255,225,0.1)', padding: '1px 4px', borderRadius: '4px' }}>YOU</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {isDrawing ? (
                            <><Pencil size={12} /> Drawing</>
                        ) : (
                            p.hasGuessed ? <><CheckCircle size={12} color="#22c55e" /> Solved</> : <><CircleHelp size={12} /> Guessing</>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--secondary)', fontSize: '1.2rem' }}>
                {p.score}
            </div>
        </div>
    );
}
