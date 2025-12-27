import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Settings, Users, Clock, Hash, Play, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface GameLobbyProps {
    title: string;
    description: string;
    gameType: string;
    gradient?: string;
    onCreateRoom: (params: RoomCreationParams) => void;
    additionalSettings?: React.ReactNode;
    rules?: string[];
}

export interface RoomConfig {
    gameDuration: number; // minutes
    roundTime: number; // seconds
    maxPlayers: number;
    hardcore: boolean;
    teamMode: boolean;
    video: boolean;
}

export interface RoomCreationParams {
    name: string;
    avatar: string;
    company: string;
    product: string;
    roomCode: string;
    config: RoomConfig;
}

export default function GameLobby({
    title,
    description,
    gameType,
    gradient = 'linear-gradient(to right, #10b981, #059669)',
    onCreateRoom,
    additionalSettings,
    rules = []
}: GameLobbyProps) {
    const { user } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [company, setCompany] = useState('');
    const [product, setProduct] = useState('');
    const [roomCode, setRoomCode] = useState('');

    // Settings State
    // Settings State
    const [gameDuration, setGameDuration] = useState(10);
    const [roundTime, setRoundTime] = useState(60);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [teamMode, setTeamMode] = useState(false);
    const [hardcore, setHardcore] = useState(false);
    const [video, setVideo] = useState(false);

    const [error, setError] = useState('');

    // Generate a random code on mount
    useEffect(() => {
        setRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    }, []);

    // Prefill from user/query
    useEffect(() => {
        if (!router.isReady) return;
        if (router.query.username) {
            setName(router.query.username as string);
        } else if (user) {
            setName(user.username);
            setAvatar(user.avatar);
        }
    }, [router.isReady, router.query, user]);

    const handleCreate = () => {
        if (!name.trim()) {
            setError('Please enter your nickname');
            return;
        }

        const config: RoomConfig = {
            gameDuration,
            roundTime,
            maxPlayers,
            hardcore,
            teamMode,
            video
        };

        onCreateRoom({
            name,
            avatar,
            company,
            product,
            roomCode,
            config
        });
    };

    // UI Helpers
    const SegmentedControl = ({ label, value, options, onChange, icon: Icon }: any) => (
        <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                {Icon && <Icon size={14} />} {label}
            </label>
            <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '4px', borderRadius: '12px', gap: '4px', border: '1px solid var(--border-subtle)' }}>
                {options.map((opt: any) => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            flex: 1,
                            background: value === opt.value ? 'var(--primary)' : 'transparent',
                            color: value === opt.value ? 'white' : 'var(--text-secondary)',
                            border: 'none',
                            padding: '10px 0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: value === opt.value ? 700 : 500,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const ToggleCard = ({ label, checked, onChange, color = 'var(--primary)', description }: any) => (
        <div
            onClick={() => onChange(!checked)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: checked ? `rgba(${color === 'var(--error)' ? '239, 68, 68' : '139, 92, 246'}, 0.1)` : 'var(--bg-app)',
                border: checked ? `1px solid ${color}` : '1px solid var(--border-subtle)',
                padding: '12px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                {/* <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{description}</span> */}
            </div>
            <div style={{
                width: '40px',
                height: '22px',
                background: checked ? color : 'rgba(255,255,255,0.1)',
                borderRadius: '50px',
                position: 'relative',
                transition: 'background 0.3s',
                flexShrink: 0
            }}>
                <div style={{
                    width: '18px',
                    height: '18px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: checked ? '20px' : '2px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
            </div>
        </div>
    );



    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-app)',
            fontFamily: 'var(--font-main)',
            color: 'var(--text-primary)',
            overflow: 'hidden'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 350px) 1fr',
                gridTemplateRows: 'minmax(0, 1fr)',
                gap: '0',
                maxWidth: '1100px',
                maxHeight: 'calc(100vh - 60px)',
                width: '100%',
                background: 'var(--bg-panel)',
                borderRadius: '32px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'var(--blur-strength)'
            }}>
                {/* LEFT: Profile & Visuals */}
                <div style={{
                    padding: '40px',
                    background: gradient,
                    display: 'flex',
                    flexDirection: 'column',
                    // alignItems: 'center', // Align left a bit more now? User said "Left side show game rules"
                    color: '#ffffff',
                    position: 'relative',
                    overflowY: 'auto',
                    minHeight: 0
                }}>
                     {/* Decorative Elements */}
                     <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(50px)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', position: 'relative', zIndex: 2 }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.3)',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            flexShrink: 0
                        }}>
                            <img
                                src={avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${name || 'guest'}`}
                                alt="avatar"
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                        <div>
                             <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', textShadow: '0 2px 10px rgba(0,0,0,0.2)', lineHeight: 1 }}>
                                {title}
                            </h2>
                            <p style={{ opacity: 0.9, fontSize: '0.9rem', marginTop: '6px', fontWeight: 500 }}>
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* How to Play Section */}
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '20px',
                        padding: '24px',
                        backdropFilter: 'blur(10px)',
                        flex: 1, // Fill remaining space
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h4 style={{ color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1.2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                            <Info size={16} /> How to Play
                        </h4>

                        {rules.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {rules.map((rule, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.95rem', color: 'rgba(255,255,255,0.95)', lineHeight: '1.4' }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            width: '20px', height: '20px',
                                            borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.7rem', fontWeight: 'bold',
                                            flexShrink: 0, marginTop: '2px'
                                        }}>{i + 1}</span>
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                         ) : (
                             <p style={{ opacity: 0.8, fontStyle: 'italic' }}>
                                 Join the lobby, wait for players, and compete to win! configure your game settings on the right.
                             </p>
                         )}
                    </div>
                </div>

                {/* RIGHT: Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface-secondary)', minHeight: 0 }}>
                    {/* Header */}
                    <div style={{ padding: '40px 40px 20px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                                <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Settings size={20} color="white" />
                                </div>
                                Room Configuration
                            </h3>
                            <div style={{ opacity: 0.5, fontSize: '0.8rem', fontFamily: 'var(--font-heading)' }}>
                                ID: {roomCode}
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: '12px', marginTop: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={16}/> {error}
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div style={{ padding: '0 40px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* 1. Identity */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-heading)' }}>Your Nickname</label>
                            <input
                                type="text"
                                className="input-field"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ENTER YOUR NAME"
                                style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '0.5px' }}
                            />
                        </div>

                        {/* 2. Room Settings (Segmented Controls) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <SegmentedControl
                                    label="Game Length"
                                    icon={Clock}
                                    value={gameDuration}
                                    options={[
                                        { label: '5m', value: 5 },
                                        { label: '10m', value: 10 },
                                        { label: '15m', value: 15 },
                                        { label: '30m', value: 30 }
                                    ]}
                                    onChange={setGameDuration}
                                />
                                <SegmentedControl
                                    label="Round Time"
                                    icon={Clock}
                                    value={roundTime}
                                    options={[
                                        { label: '30s', value: 30 },
                                        { label: '45s', value: 45 },
                                        { label: '60s', value: 60 },
                                        { label: '90s', value: 90 }
                                    ]}
                                    onChange={setRoundTime}
                                />
                            </div>

                            <SegmentedControl
                                label="Max Players"
                                icon={Users}
                                value={maxPlayers}
                                options={[
                                    { label: '4', value: 4 },
                                    { label: '8', value: 8 },
                                    { label: '12', value: 12 },
                                    { label: '16', value: 16 },
                                    { label: '20', value: 20 }
                                ]}
                                onChange={setMaxPlayers}
                            />
                        </div>

                        {/* 3. Toggles */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                             <ToggleCard
                                label="Team Mode"
                                checked={teamMode}
                                onChange={setTeamMode}
                                description="Red vs Blue Team Battle"
                             />
                             <ToggleCard
                                label="Hardcore"
                                checked={hardcore}
                                onChange={setHardcore}
                                color="var(--error)"
                                description="No hints, faster timers"
                             />
                             <ToggleCard
                                label="Video Chat"
                                checked={video}
                                onChange={setVideo}
                                color="#4ade80"
                                description="Enable camera & mic"
                             />
                        </div>

                        {additionalSettings && (
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
                                {additionalSettings}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '24px 40px 40px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                        <button
                            onClick={handleCreate}
                            className="btn-primary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '1.2rem', padding: '18px', borderRadius: '16px' }}
                        >
                            <Play fill="currentColor" size={20} /> START GAME
                        </button>

                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .hover\\:text-primary:hover {
                    color: var(--primary) !important;
                }
            `}</style>
        </div>
    );
}
