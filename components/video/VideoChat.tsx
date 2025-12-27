import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import type { Peer } from '../../hooks/useWebRTC';

interface VideoChatProps {
    roomCode: string;
    myName: string;
    myAvatar: string;
    players: any[]; // To map socketId to names/avatars
    // WebRTC Props from Hook
    localStream: MediaStream | null;
    peers: Peer[];
    toggleVideo: () => void;
    toggleAudio: () => void;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    permissionError: boolean;
    layout?: 'grid' | 'list';
}

export const VideoTile = ({ stream, isLocal, name, avatar, videoEnabled, audioEnabled, style = {}, compact = false }: any) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
    }, [stream, videoEnabled]);

    return (
        <div className="video-tile" style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1', // Default Square
            background: '#1e293b',
            borderRadius: '12px',
            overflow: 'hidden',
            border: videoEnabled ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            ...style // Override defaults
        }}>
            {/* Video Layer */}
            {videoEnabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Always mute self
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: isLocal ? 'scaleX(-1)' : 'none' // Mirror self
                    }}
                />
            ) : (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0f172a',
                    flexDirection: 'column',
                    gap: compact ? '5px' : '10px'
                }}>
                     <img src={avatar} alt={name} style={{ width: compact ? '40px' : '80px', height: compact ? '40px' : '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                </div>
            )}

            {/* Overlays */}
            <div style={{
                position: 'absolute',
                bottom: compact ? '5px' : '12px',
                left: compact ? '5px' : '12px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                padding: compact ? '4px 8px' : '6px 10px',
                borderRadius: '20px',
                fontSize: compact ? '0.7rem' : '0.8rem',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500
            }}>
                {audioEnabled ? <Mic size={compact ? 12 : 14} className="text-green-400" /> : <MicOff size={compact ? 12 : 14} className="text-red-400" />}
                <span>{name} {isLocal ? '(You)' : ''}</span>
            </div>
        </div>
    );
};

export default function VideoChat({
    roomCode, myName, myAvatar, players,
    localStream, peers, toggleVideo, toggleAudio, isVideoEnabled, isAudioEnabled, permissionError,
    layout = 'grid'
}: VideoChatProps) {

    if (permissionError && peers.length === 0) {
        return <div style={{ padding: '20px', color: 'var(--error)', textAlign: 'center' }}>Waiting for video connection... (Check Permissions/HTTPS)</div>;
    }

    // Helper to get player details from socketId
    const getPlayerDetails = (socketId: string) => {
        const p = players.find(p => p.id === socketId);
        return {
            name: p?.name || 'Unknown',
            avatar: p?.avatar || '/avatars/avator01.svg'
        };
    };

    // Unified list of all participants to render in the grid
    // We iterate over 'players' (all room members) and try to match with 'peers' (active video connections)
    // The local user is handled separately or filtered from the players list typically, but here we can just merge.

    // Create a robust list of items to render
    const allParticipants = players.map(p => {
        // Is this me?
        // Note: myName might not be unique, robust apps use IDs. Assuming players[i].name === myName for now if IDs missing or complex.
        // Actually we have passed myName. Let's use p.name === myName. (Ideally we'd use socket.id)

        // Find if there is a peer connection for this player
        const peer = peers.find(peer => peer.socketId === p.id);

        // Local User Logic
        // In this app, we don't always have 'myId' passed perfectly to VideoChat,
        // but we know localStream is separate.
        // If p.name === myName, we use localStream.
        const isMe = p.name === myName;

        return {
            id: p.id,
            name: p.name,
            avatar: p.avatar || '/avatars/avator01.svg',
            isLocal: isMe,
            stream: isMe ? localStream : (peer?.stream || null),
            videoEnabled: isMe ? isVideoEnabled : (peer?.isVideoEnabled || false),
            audioEnabled: isMe ? isAudioEnabled : (peer?.isAudioEnabled || false),
            // If it's not me and no peer found, they are "audio/video missing" or just simple user tile
            isConnected: isMe || !!peer
        };
    });

    return (
        <div className="video-grid-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
            {/* Grid */}
            <div style={{
                display: 'grid',
                // Responsive grid: larger min-width for main grid view to resemble meet tiles, full width for list
                gridTemplateColumns: layout === 'list' ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                gridAutoRows: layout === 'list' ? 'auto' : '1fr', // ensure rows try to fill space
                gap: '15px',
                overflowY: 'auto',
                flex: 1,
                paddingRight: '5px',
                alignContent: 'center', // Center content vertically if few items
                justifyContent: 'center' // Center content horizontally
            }}>
                {allParticipants.map(participant => (
                     <VideoTile
                        key={participant.id}
                        stream={participant.stream}
                        isLocal={participant.isLocal}
                        name={participant.name}
                        avatar={participant.avatar}
                        videoEnabled={participant.videoEnabled}
                        audioEnabled={participant.audioEnabled}
                    />
                ))}
            </div>
        </div>
    );
}
