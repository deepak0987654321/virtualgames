import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const RoomRedirect = () => {
    const router = useRouter();
    const { roomId } = router.query;
    const [status, setStatus] = useState('Loading...');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!router.isReady || !roomId) return;

        const socket = io();

        socket.on('connect', () => {
             socket.emit('check_room', { roomCode: roomId }, (response: any) => {
                 if (response.success && response.gameType) {
                     setStatus('Loading...');

                     // Redirect to Tenant-specific URL if slug is available
                     if (response.tenantSlug) {
                         router.replace(`/${response.tenantSlug}/${response.gameType}/room/${roomId}`);
                     } else {
                         router.replace(`/${response.gameType}/room/${roomId}`);
                     }
                 } else {
                     setError(response.error || 'Room not found');
                     setStatus('');
                 }
                 socket.disconnect();
             });
        });

        return () => {
            socket.disconnect();
        };
    }, [router.isReady, roomId]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            {error ? (
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }}>Oops!</h1>
                    <p style={{ opacity: 0.8, fontSize: '1.2rem' }}>{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            marginTop: '2rem',
                            padding: '12px 24px',
                            background: 'white',
                            color: 'black',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Go Home
                    </button>
                </div>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <div className="countdown-ring" style={{ width: '60px', height: '60px', margin: '0 auto 20px', borderTopColor: '#3b82f6' }}></div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 500 }}>{status}</h2>
                </div>
            )}
        </div>
    );
};

export default RoomRedirect;
