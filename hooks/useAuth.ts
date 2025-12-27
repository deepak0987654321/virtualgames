import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAuth() {
    const [user, setUser] = useState<{
        id?: string, // Added for compatibility
        username: string,
        avatar: string,
        session_token: string,
        playerId: string,
        tenantId?: string,
        role?: 'admin' | 'player' | string,
        wins?: number,
        losses?: number,
        totalScore?: number
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [deviceId, setDeviceId] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Initialize Device ID
        let dId = localStorage.getItem('deviceId');
        if (!dId) {
            dId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('deviceId', dId);
        }
        setDeviceId(dId);

        const check = async () => {
            const token = localStorage.getItem('session_token');
            const playerId = localStorage.getItem('playerId');

            if (token && playerId) {
                try {
                    const res = await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                        cache: 'no-store'
                    });
                    if (res.ok) {
                        const session = await res.json();
                        const userData = {
                            id: session.user_id,
                            username: session.username,
                            avatar: session.avatar,
                            session_token: session.session_token,
                            playerId: session.user_id,
                            wins: session.wins,
                            losses: session.losses,
                            totalScore: session.totalScore,
                            role: session.role,
                            tenantId: session.tenant_id
                        };
                        setUser(userData);
                        // Rule: Keep storage synced with session data
                        localStorage.setItem('playerId', session.user_id);
                        localStorage.setItem('username', session.username);
                        localStorage.setItem('avatar', session.avatar);
                        if (session.role) localStorage.setItem('role', session.role);
                        if (session.tenant_id) localStorage.setItem('tenantId', session.tenant_id);
                    } else {
                        // Invalid token -> Reset identity as per Rule 2
                        localStorage.removeItem('session_token');
                        localStorage.removeItem('playerId');
                        localStorage.removeItem('username');
                        localStorage.removeItem('avatar');
                        setUser(null);
                    }
                } catch (e) {
                    console.error("Auth check failed", e);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };
        check();
    }, []);

    const logout = async (redirectPath: string = '/') => {
        const token = localStorage.getItem('session_token');
        if (token) {
            try {
                await fetch('/api/auth/session', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
            } catch (e) {}
        }
        // Rule 2: Remove playerId from local storage on logout
        localStorage.removeItem('session_token');
        localStorage.removeItem('playerId');
        localStorage.removeItem('username');
        localStorage.removeItem('avatar');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('role');
        setUser(null);
        router.push(redirectPath);
    };

    const login = async (username: string, avatar: string, tenantSlug?: string) => {
        // Ensure we have the device ID
        const finalDeviceId = deviceId || localStorage.getItem('deviceId');
        if (!finalDeviceId) {
            console.error("No device ID found during login");
            return false;
        }

        try {
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    avatar,
                    deviceId: finalDeviceId,
                    tenantSlug
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.session) {
                    const userData = {
                        id: data.playerId,
                        username: data.user.username,
                        avatar: data.user.avatar,
                        session_token: data.session.session_token,
                        playerId: data.playerId,
                        tenantId: data.user.tenantId || data.user.tenant_id,
                        role: data.user.role,
                        wins: data.user.wins,
                        losses: data.user.losses,
                        totalScore: data.user.totalScore
                    };

                    localStorage.setItem('session_token', data.session.session_token);
                    localStorage.setItem('playerId', data.playerId);
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('avatar', data.user.avatar);
                    if (data.user.tenantId) localStorage.setItem('tenantId', data.user.tenantId);
                    if (data.user.role) localStorage.setItem('role', data.user.role);

                    setUser(userData);
                    return true;
                }
            } else {
                const err = await res.json();
                console.error('Login failed:', err);
                alert(err.error || 'Login failed');
            }
        } catch (e) {
            console.error("Login Error", e);
        }
        return false;
    };

    return { user, loading, logout, login, deviceId };
}
