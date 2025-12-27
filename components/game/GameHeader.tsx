import React from 'react';
import { useRouter } from 'next/router';
import { Home, Link as LinkIcon, Clock } from 'lucide-react';

interface GameHeaderProps {
    roomCode: string;
    timeLeft: number; // Global time in seconds
    children?: React.ReactNode; // For optional right-side content (Round status)
}

export default function GameHeader({ roomCode, timeLeft, children }: GameHeaderProps) {
    const router = useRouter();
    const [copied, setCopied] = React.useState(false);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleInvite = async () => {
        // Use current URL which includes tenant slug and game type
        // This ensures the invitee lands in the correct tenant context
        const url = window.location.href.split('?')[0];

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for insecure contexts
                const textArea = document.createElement("textarea");
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
            prompt('Copy this link:', url);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '10px 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', position: 'relative', zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                    onClick={() => {
                        const { slug } = router.query;
                        if (slug) {
                            router.push(`/${slug}/lobby`);
                        } else {
                            router.push('/');
                        }
                    }}
                    style={{
                        background: '#ffffff',
                        border: 'none',
                        color: '#000000',
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    title="Back to Lobby"
                >
                    <Home size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>

                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', padding: '5px 10px', borderRadius: '8px' }}>
                            Room: {roomCode}
                        </div>

                        <button
                            onClick={handleInvite}
                            className="btn-primary"
                            style={{
                                fontSize: '0.85rem',
                                padding: '8px 16px',
                                background: 'linear-gradient(90deg, #22d3ee, #0ea5e9)',
                                border: 'none',
                                borderRadius: '50px',
                                boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            <LinkIcon size={14} /> Invite Friends
                        </button>

                        {/* Copied Tooltip */}
                        <div style={{
                            position: 'absolute',
                            top: '-35px',
                            left: '50%',
                            transform: `translateX(-50%) scale(${copied ? 1 : 0.5})`,
                            background: '#22c55e',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            opacity: copied ? 1 : 0,
                            pointerEvents: 'none',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                             Link Copied!
                        </div>

                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} />
                        <span>Game Time: {formatTime(timeLeft)}</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Game Specific Status */}
            <div style={{ textAlign: 'right', paddingLeft: '20px', borderLeft: '1px solid var(--border)' }}>
                {children}
            </div>
        </div>
    );
}
