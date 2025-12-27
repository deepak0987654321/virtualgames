import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';

export default function UnifiedGameRoom() {
    const router = useRouter();
    const { slug, roomId } = router.query;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!router.isReady || !roomId) return;

        const socket = io();
        socket.emit('check_room', { roomCode: roomId }, (response: any) => {
            if (response.success && response.gameType) {
                // Redirect to the dedicated route for this game type
                // This ensures we use the dedicated page's JoinGameOverlay and auth logic
                router.replace(`/${slug}/${response.gameType}/room/${roomId}`);
            } else {
                setError(response.error || 'Room not found');
                setLoading(false);
            }
            socket.disconnect();
        });

    }, [router.isReady, roomId, slug]);

    if (error) return (
        <div className="center-content">
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--error)' }}>Error</h2>
                <p>{error}</p>
                <button className="btn-secondary" onClick={() => router.push(`/${slug}/lobby`)} style={{ marginTop: '20px' }}>
                    Back to Lobby
                </button>
            </div>
        </div>
    );

    return (
        <div className="center-content">
            <div className="countdown-ring" />
            <p style={{ marginTop: '20px' }}>Loading...</p>
        </div>
    );
}
