import React, { useState, useEffect } from 'react';
import { Rocket, Camera, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import { AVATARS } from '../../lib/avatars';

interface JoinGameOverlayProps {
    roomCode: string;
    onJoin: (name: string, avatar: string, audioOn: boolean, videoOn: boolean, playerId?: string) => void;
    forceVideoOn?: boolean;
}

export default function JoinGameOverlay({ roomCode, onJoin, forceVideoOn = false }: JoinGameOverlayProps) {
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [displayAvatars, setDisplayAvatars] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isAddingProfile, setIsAddingProfile] = useState(false);

    // Camera Preview State
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [camError, setCamError] = useState('');
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);

    useEffect(() => {
        setDisplayAvatars(AVATARS.slice(0, 12));

        const checkSession = async () => {
            const token = localStorage.getItem('session_token');
            const storedPlayerId = localStorage.getItem('playerId');
            const dId = localStorage.getItem('deviceId') || ('dev_' + Math.random().toString(36).substr(2, 9));
            if (!localStorage.getItem('deviceId')) localStorage.setItem('deviceId', dId);

            if (token && storedPlayerId) {
                try {
                    const res = await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    if (res.ok) {
                        const session = await res.json();
                        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                        onJoin(session.username, session.avatar || AVATARS[0], isAudioOn, isVideoOn, session.user_id);
                        return;
                    }
                } catch (e) {
                    console.error("Session check failed", e);
                }
            }

            // If no active session, fetch profiles for this device
            try {
                const res = await fetch(`/api/profiles?deviceId=${dId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);
                    if (data.length === 0) setIsAddingProfile(true);
                }
            } catch (e) {
                console.error("Failed to fetch profiles", e);
                setIsAddingProfile(true);
            }
        };
        checkSession();

        return () => {
             if (cameraStream) {
                 cameraStream.getTracks().forEach(t => t.stop());
             }
        };
    }, []);

    const handleTestCamera = async () => {
        try {
            setCamError('');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCamError("Camera requires HTTPS or localhost.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCameraStream(stream);
        } catch (err) {
            console.warn("Video failed, trying audio only...", err);
            try {
                 const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                 setCameraStream(stream);
                 setCamError("Video failed. Using Audio Only.");
            } catch (err2) {
                console.error("Camera Test Failed:", err2);
                setCamError("Permission denied or no device found.");
            }
        }
    };

    const handleJoin = async (overrideName?: string, overrideAvatar?: string) => {
        const finalName = overrideName || name;
        const finalAvatar = overrideAvatar || selectedAvatar;

        if (!finalName.trim()) {
            setError('Please enter a nickname');
            return;
        }

        try {
            const dId = localStorage.getItem('deviceId');
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: finalName,
                    avatar: finalAvatar,
                    deviceId: dId
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.session) {
                    localStorage.setItem('session_token', data.session.session_token);
                    localStorage.setItem('playerId', data.playerId);
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('avatar', data.user.avatar);
                }

                if (cameraStream) {
                    cameraStream.getTracks().forEach(t => t.stop());
                    setCameraStream(null);
                }
                onJoin(finalName, finalAvatar, isAudioOn, isVideoOn, data.playerId);
            } else {
                const err = await res.json();
                setError(err.error || 'Join failed');
            }
        } catch (e) {
            console.error("Join failed", e);
            setError('Network error. Please try again.');
        }
    };

    return (
        <div className="overlay-backdrop">
            <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', width: '90%', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
                <h1 style={{ fontSize: '2rem', background: 'linear-gradient(to right, #22d3ee, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
                    Join Party
                </h1>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7, marginRight: '10px' }}>Room Code:</span>
                    <span style={{ fontSize: '1.2rem', fontFamily: 'Space Grotesk', fontWeight: 'bold' }}>{roomCode}</span>
                </div>

                {(!isAddingProfile && profiles.length > 0) ? (
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ marginBottom: '20px', opacity: 0.8 }}>Who is playing?</h3>
                        <div className="profile-selection-grid">
                            {profiles.map(p => (
                                <div key={p.id} className="mini-profile-card" onClick={() => handleJoin(p.username, p.avatar)}>
                                    <img src={p.avatar} alt={p.username} />
                                    <span>{p.username}</span>
                                </div>
                            ))}
                            <div className="mini-profile-card" onClick={() => setIsAddingProfile(true)}>
                                <div className="plus-avatar">+</div>
                                <span>Add New</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)' }}>Choose Your Avatar</label>
                            <div className="avatar-grid">
                                {displayAvatars.map(url => (
                                    <img
                                        key={url}
                                        src={url}
                                        alt="avatar"
                                        onClick={() => setSelectedAvatar(url)}
                                        className={selectedAvatar === url ? 'selected' : ''}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                             <label style={{ display: 'block', marginBottom: '15px', color: 'var(--text-muted)' }}>Camera Setup</label>
                             <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px' }}>
                                {cameraStream ? (
                                    <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative', aspectRatio: '16/9', background: '#000' }}>
                                        <video
                                            ref={vid => { if (vid) vid.srcObject = cameraStream; }}
                                            autoPlay
                                            muted
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: isVideoOn ? 1 : 0 }}
                                        />
                                        {!isVideoOn && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <img src={selectedAvatar} alt="avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', opacity: 0.7 }} />
                                            </div>
                                        )}
                                        <div style={{
                                            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                                            display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.6)', padding: '8px 15px', borderRadius: '20px', backdropFilter: 'blur(4px)'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    const track = cameraStream.getAudioTracks()[0];
                                                    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled); }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: isAudioOn ? 'white' : '#ef4444', cursor: 'pointer', display: 'flex' }}
                                            >
                                                {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                     if (forceVideoOn) return;
                                                     const track = cameraStream.getVideoTracks()[0];
                                                     if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled); }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: isVideoOn ? 'white' : '#ef4444', cursor: forceVideoOn ? 'not-allowed' : 'pointer', display: 'flex' }}
                                            >
                                                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={handleTestCamera} style={{ background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text)', padding: '15px', borderRadius: '8px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <Camera size={20} />
                                        <span>Test Camera</span>
                                    </button>
                                )}
                                {camError && <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '10px' }}>{camError}</div>}
                             </div>
                        </div>

                        <input
                            type="text"
                            className="input-field"
                            placeholder="Your Nickname"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                            style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.1rem', padding: '12px', width: '100%' }}
                            autoFocus
                        />

                        {error && <div style={{ color: 'var(--error)', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {profiles.length > 0 && <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddingProfile(false)}>Cancel</button>}
                            <button className="btn-primary" style={{ flex: 2 }} onClick={() => handleJoin()}>
                                Join <Rocket size={18} style={{ marginLeft: '8px' }} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                .profile-selection-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .mini-profile-card {
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.2s;
                }
                .mini-profile-card:hover { transform: scale(1.05); }
                .mini-profile-card img, .plus-avatar {
                    width: 100%;
                    max-width: 100px;
                    aspect-ratio: 1/1;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid transparent;
                    transition: border-color 0.2s;
                }
                .mini-profile-card:hover img, .mini-profile-card:hover .plus-avatar { border-color: white; }
                .plus-avatar { display: flex; align-items: center; justify-content: center; font-size: 40px; color: rgba(255,255,255,0.2); }
                .mini-profile-card span { font-size: 0.9rem; opacity: 0.8; }
                .mini-profile-card:hover span { opacity: 1; }

                .avatar-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 8px;
                    justify-items: center;
                }
                .avatar-grid img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                    background: rgba(255,255,255,0.1);
                }
                .avatar-grid img.selected {
                    border-color: var(--accent);
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
}
