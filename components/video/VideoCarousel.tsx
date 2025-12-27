import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { VideoTile } from './VideoChat';

interface VideoCarouselProps {
    players: any[];
    peers: any[];
    localStream: MediaStream | null;
    myName: string;
    toggleVideo: () => void;
    toggleAudio: () => void;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    className?: string;
    actorId?: string; // To filter out acting player if passed here
    myId?: string;
}

export default function VideoCarousel({
    players, peers, localStream, myName,
    toggleVideo, toggleAudio, isVideoEnabled, isAudioEnabled,
    className, actorId, myId
}: VideoCarouselProps) {
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 4;

    // Filter participants (exclude actor)
    // Map players to their stream/peer data
    const participants = players.filter(p => p.id !== actorId).map(p => {
        const isMe = p.name === myName; // or check ID if available
        let stream = null;
        let videoOn = false;
        let audioOn = false;

        if (isMe) {
            stream = localStream;
            videoOn = isVideoEnabled;
            audioOn = isAudioEnabled;
        } else {
            const peer = peers.find(peer => peer.socketId === p.id);
            if (peer) {
                stream = peer.stream;
                videoOn = peer.isVideoEnabled;
                audioOn = peer.isAudioEnabled;
            }
        }

        return {
            ...p,
            stream,
            videoOn,
            audioOn,
            isMe
        };
    });

    const totalPages = Math.ceil(participants.length / ITEMS_PER_PAGE);
    const currentItems = participants.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    const nextPage = () => setPage(p => Math.min(p + 1, totalPages - 1));
    const prevPage = () => setPage(p => Math.max(0, p - 1));

    if (participants.length === 0) return null;

    return (
        <div className={`video-carousel ${className || ''}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '160px', /* Fixed height for carousel strip */
            padding: '10px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '12px',
            marginTop: '10px'
        }}>
            <button
                onClick={prevPage}
                disabled={page === 0}
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: page === 0 ? 'default' : 'pointer',
                    opacity: page === 0 ? 0.3 : 1,
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <ChevronLeft size={20} />
            </button>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${ITEMS_PER_PAGE}, 1fr)`, gap: '10px', height: '100%' }}>
                {currentItems.map((p: any) => (
                    <div key={p.id} style={{ position: 'relative', height: '100%', borderRadius: '8px', overflow: 'hidden', background: '#334155' }}>
                         <VideoTile
                            stream={p.stream}
                            isLocal={p.isMe}
                            name={p.name}
                            avatar={p.avatar}
                            videoEnabled={p.videoOn}
                            audioEnabled={p.audioOn}
                            style={{ height: '100%', aspectRatio: 'unset' }}
                            compact={true} // Hint to remove bulky overlays if supported
                         />
                         {/* Mini Name Label handled by VideoTile mostly, but we can override if needed */}
                    </div>
                ))}

                {/* Fillers to keep grid stable if last page has fewer items? */}
                {Array.from({ length: ITEMS_PER_PAGE - currentItems.length }).map((_, i) => (
                     <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                ))}
            </div>

            <button
                onClick={nextPage}
                disabled={page >= totalPages - 1}
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                    opacity: page >= totalPages - 1 ? 0.3 : 1,
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
