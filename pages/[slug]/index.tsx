import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Head from 'next/head';
import { AVATARS } from '../../lib/avatars';
import { User, ArrowRight, Plus, X, Lock } from 'lucide-react';

export default function TenantWelcome() {
    const router = useRouter();
    const { slug } = router.query;
    const { user, login, deviceId } = useAuth();
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState(AVATARS[0]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'picker' | 'create'>('picker');
    const [isManaging, setIsManaging] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessCodeInput, setAccessCodeInput] = useState('');
    const [unlockError, setUnlockError] = useState(false);

    const handleUnlock = async () => {
        if (!accessCodeInput.trim()) return;
        try {
            const res = await fetch(`/api/tenant/${slug}/verify-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: accessCodeInput })
            });
            const data = await res.json();
            if (data.success) {
                setIsUnlocked(true);
            } else {
                setUnlockError(true);
                setTimeout(() => setUnlockError(false), 2000);
            }
        } catch (e) {
            setUnlockError(true);
        }
    };

    useEffect(() => {
        if (!slug) return;

        // 1. Fetch/Create Tenant
        fetch(`/api/tenant/${slug}`)
            .then(res => res.json())
            .then(data => {
                setTenant(data.tenant);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [slug]);

    // Fetch users when deviceId AND tenant are ready
    useEffect(() => {
        if (slug && deviceId) {
             fetchUsers();
        }
    }, [slug, deviceId]);

    const fetchUsers = () => {
        if (!slug || !deviceId) return;

        fetch(`/api/tenant/${slug}/users/public?deviceId=${deviceId}`)
            .then(res => res.json())
            .then(uData => {
                if (uData.users && uData.users.length > 0) {
                    setExistingUsers(uData.users);
                    setViewMode('picker');
                } else {
                    setViewMode('create');
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        // If already logged in and scoped to this tenant, redirect to lobby
        if (user && user.tenantId === tenant?.tenant_id) {
             router.push(`/${slug}/lobby`);
        }
    }, [user, tenant, slug]);

    const handleJoin = async (nameOverride?: string, avatarOverride?: string) => {
        if (isManaging) return;

        const finalName = nameOverride || username;
        const finalAvatar = avatarOverride || avatar;

        if (!finalName.trim() || !tenant) return;

        const success = await login(finalName, finalAvatar, slug as string);
        if (success) {
            router.push(`/${slug}/lobby`);
        }
    };

    const handleDeleteProfile = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this profile? All stats will be lost.')) return;

        try {
            const res = await fetch(`/api/tenant/${slug}/user/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                setExistingUsers(prev => prev.filter(u => u.id !== userId));
                if (existingUsers.length <= 1) {
                    setViewMode('create');
                    setIsManaging(false);
                }
            } else {
                alert('Failed to delete profile');
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ... render ...


    if (loading) return (
        <div className="center-content" style={{ background: 'var(--bg-app)' }}>
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
                <div className="countdown-ring" />
                <p style={{ marginTop: '20px', color: 'var(--text-primary)' }}>Loading Space...</p>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-app)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <Head>
                <title>{tenant?.name} | Login</title>
            </Head>

            {/* View Mode: Profile Picker vs Create New */}
            {viewMode === 'picker' && existingUsers.length > 0 ? (
                 <div className="glass-panel" style={{ padding: '60px', animation: 'fadeIn 0.5s', maxWidth: '1000px', width: '90%', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
                     <h1 style={{ fontSize: '3rem', marginBottom: '50px', fontWeight: 700, textAlign: 'center', textShadow: '0 4px 20px var(--accent-glow)', color: 'var(--text-primary)' }}>
                        {isManaging ? 'Manage Profiles' : "Who's playing?"}
                     </h1>
                     <div className="profile-grid">
                         {existingUsers.map(u => (
                             <div
                                key={u.id}
                                className={`profile-card ${isManaging ? 'managing' : ''}`}
                                onClick={(e) => isManaging ? handleDeleteProfile(u.id, e) : handleJoin(u.username, u.avatar)}
                            >
                                 <div style={{ position: 'relative' }}>
                                    <img src={u.avatar} className="profile-avatar" style={{ filter: isManaging ? 'brightness(0.6)' : 'none' }} />
                                    {isManaging && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            <X size={40} />
                                        </div>
                                    )}
                                 </div>
                                 <div className="profile-name">{u.username}</div>
                             </div>
                         ))}
                         {/* Add Profile Button - Hidden when managing */}
                         {!isManaging && tenant?.visibility !== 'private' && (
                             <div className="profile-card" onClick={() => setViewMode('create')}>
                                 <div className="profile-avatar add-btn">
                                     <Plus size={50} color="var(--text-secondary)" />
                                 </div>
                                 <div className="profile-name">Add Profile</div>
                             </div>
                         )}
                     </div>
                     <div style={{ textAlign: 'center', marginTop: '50px' }}>
                        <button
                            className="manage-btn"
                            onClick={() => setIsManaging(!isManaging)}
                            style={{ background: isManaging ? 'var(--bg-surface-secondary)' : 'transparent', color: isManaging ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                        >
                            {isManaging ? 'Done' : 'Manage Profiles'}
                        </button>
                     </div>
                 </div>
            ) : tenant?.visibility === 'private' && !isUnlocked ? (
                <div className="glass-panel" style={{ padding: '60px', maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.5s', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '1px solid var(--border-subtle)' }}>
                        <Lock size={36} color="var(--text-secondary)" />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '15px', color: 'var(--text-primary)' }}>Private Workspace</h1>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '30px' }}>
                        This workspace is invite-only.<br/>
                        Please enter the access code to join.
                    </p>

                    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                        <input
                            type="password"
                            placeholder="Enter Access Code"
                            value={accessCodeInput}
                            onChange={e => { setAccessCodeInput(e.target.value); setUnlockError(false); }}
                            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                            className="input-field"
                            style={{
                                width: '100%',
                                padding: '15px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                letterSpacing: '4px',
                                marginBottom: '15px',
                                borderColor: unlockError ? 'var(--error)' : 'var(--border-subtle)'
                            }}
                            autoFocus
                        />
                        <button
                            className="btn-primary"
                            onClick={handleUnlock}
                            style={{ width: '100%', padding: '15px' }}
                        >
                            Unlock Access
                        </button>
                    </div>

                    {existingUsers.length > 0 && (
                        <button
                            className="manage-btn"
                            onClick={() => setViewMode('picker')}
                            style={{ marginTop: '30px' }}
                        >
                            Back to Profiles
                        </button>
                    )}
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.5s', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
                    {existingUsers.length > 0 && (
                        <button
                            onClick={() => setViewMode('picker')}
                            style={{ position: 'absolute', left: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.7 }}
                        >
                            <ArrowRight style={{ transform: 'rotate(180deg)' }} size={16} /> Back
                        </button>
                    )}

                    <h3 style={{ opacity: 0.6, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px', color: 'var(--text-secondary)' }}>WELCOME TO</h3>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {tenant?.name}
                    </h1>

                    <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                        <User size={20} /> Create Your Profile
                    </h2>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', opacity: 0.7, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Choose Avatar</label>
                        <div className="avatar-selector">
                            {AVATARS.slice(0, 10).map((a) => (
                                <img
                                    key={a}
                                    src={a}
                                    className={`avatar-option ${avatar === a ? 'selected' : ''}`}
                                    onClick={() => setAvatar(a)}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', opacity: 0.7, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Your Name</label>
                        <input
                            className="input-field"
                            placeholder="e.g. Captain Amazing"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleJoin(username, avatar)}
                            style={{ padding: '15px', textAlign: 'center', fontSize: '1.2rem', width: '100%', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', outline: 'none' }}
                            autoFocus
                        />
                    </div>

                    <button
                        className="btn-primary"
                        onClick={() => handleJoin(username, avatar)}
                        disabled={!username.trim()}
                        style={{ width: '100%', padding: '15px', opacity: !username.trim() ? 0.5 : 1, background: 'var(--accent)', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                    >
                        Continue <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                    </button>
                </div>
            )}

            <style jsx>{`
                .profile-grid {
                    display: flex;
                    gap: 30px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .profile-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .profile-card:hover {
                    transform: translateY(-5px) scale(1.05);
                }
                .profile-card:hover .profile-avatar {
                    border-color: var(--text-primary);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                }
                .profile-card:hover .profile-name {
                    color: var(--text-primary);
                    text-shadow: 0 0 10px var(--accent-glow);
                }
                .profile-avatar {
                    width: 140px;
                    height: 140px;
                    border-radius: 12px;
                    background-color: var(--bg-surface-secondary);
                    object-fit: cover;
                    border: 3px solid transparent;
                    transition: all 0.3s;
                    box-shadow: var(--shadow-sm);
                }
                .add-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-surface-secondary);
                    border: 3px solid var(--border-subtle);
                }
                .add-btn:hover {
                    background: var(--bg-panel);
                    border-color: var(--accent);
                }
                .profile-name {
                    color: var(--text-secondary);
                    font-size: 1.3rem;
                    font-weight: 500;
                    transition: color 0.3s;
                }
                .manage-btn {
                    background: transparent;
                    border: 1px solid var(--border-subtle);
                    color: var(--text-secondary);
                    padding: 10px 30px;
                    font-size: 1rem;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s;
                    border-radius: 4px;
                }
                .manage-btn:hover {
                    color: var(--text-primary);
                    border-color: var(--text-primary);
                    background: var(--bg-surface-secondary);
                }
                .avatar-selector {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .avatar-option {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                    background: var(--bg-surface-secondary);
                }
                .avatar-option:hover {
                    transform: scale(1.1);
                }
                .avatar-option.selected {
                    border-color: var(--accent);
                    box-shadow: 0 0 15px var(--accent-glow);
                    transform: scale(1.1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .profile-card.managing:hover {
                    transform: scale(1.05); /* Less movement */
                }
                .profile-card.managing .profile-name {
                    opacity: 0.7;
                }
                @keyframes shake {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(-2deg); }
                    75% { transform: rotate(2deg); }
                    100% { transform: rotate(0deg); }
                }
                .profile-card.managing {
                    animation: shake 0.3s infinite ease-in-out;
                    animation-play-state: paused;
                }
                .profile-card.managing:hover {
                    animation-play-state: running;
                }
            `}</style>
        </div>
    );
}
