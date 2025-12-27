import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Settings, Users, Shield, ArrowLeft, Check, X, Brain, Grid, LogOut, Activity, Search, PlusCircle, Save, Globe, Lock } from 'lucide-react';
import CustomSelect from '../../components/ui/CustomSelect';

const GAMES = [
    { id: 'rebus', name: 'Word Guess' },
    { id: 'draw', name: 'Draw & Guess' },
    { id: 'charades', name: 'Video Charades' },
    { id: 'categories', name: 'Categories' },
];

const ADMIN_PASSWORD = 'admin123'; // In production, use env var

export default function SuperAdminDashboard() {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState(false);

    // Data State
    const router = useRouter();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newTenant, setNewTenant] = useState({ slug: '', name: '', visibility: 'public', accessCode: '' });

    // Check session storage on mount
    useEffect(() => {
        const storedAuth = sessionStorage.getItem('superadmin_auth');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
            setTimeout(fetchTenants, 0);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('superadmin_auth', 'true');
            fetchTenants();
        } else {
            setAuthError(true);
        }
    };

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_PASSWORD
    });

    const fetchTenants = () => {
        setLoading(true);
        fetch('/api/superadmin/tenants', { headers: getHeaders() })
            .then(async res => {
                if (!res.ok) throw new Error('Auth Failed');
                return res.json();
            })
            .then(data => {
                setTenants(data.tenants || []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                setIsAuthenticated(false);
                setAuthError(true);
            });
    };

    const fetchTenantUsers = (tenantId: string) => {
        fetch(`/api/superadmin/tenant/${tenantId}/users`, { headers: getHeaders() })
            .then(res => res.json())
            .then(data => setTenantUsers(data.users || []));
    };

    const handleSelectTenant = (tenant: any) => {
        setSelectedTenant(tenant);
        fetchTenantUsers(tenant.tenant_id);
    };

    // Toast State
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const updateTenantSettings = async (updates: any) => {
        if (!selectedTenant) return;
        try {
            const res = await fetch(`/api/superadmin/tenant/${selectedTenant.tenant_id}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed');

            setTenants((prev: any[]) => prev.map(t => t.tenant_id === selectedTenant.tenant_id ? { ...t, ...updates } : t));
            setSelectedTenant((prev: any) => ({ ...prev, ...updates }));
            showToast('Tenant settings updated');
        } catch (e) {
            showToast('Failed to update tenant', 'error');
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/superadmin/user/${userId}/role`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Failed');

            setTenantUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`User role updated to ${newRole}`);
        } catch (e) {
            showToast('Failed to update role', 'error');
        }
    };

    const createTenant = async () => {
        if (!newTenant.slug || !newTenant.name) return showToast('Slug and Name required', 'error');
        try {
            const res = await fetch('/api/superadmin/tenants', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newTenant)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');

            setTenants([data.tenant, ...tenants]);
            setNewTenant({ slug: '', name: '', visibility: 'public', accessCode: '' });
            setIsCreating(false);
            showToast('Tenant Created Successfully');
        } catch (e: any) {
            showToast('Failed to create tenant: ' + e.message, 'error');
        }
    };

    const toggleGame = (gameId: string) => {
        if (!selectedTenant) return;
        const currentGames = selectedTenant.allowed_games || [];
        const newGames = currentGames.includes(gameId)
            ? currentGames.filter((g: string) => g !== gameId)
            : [...currentGames, gameId];
        updateTenantSettings({ allowed_games: newGames });
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('superadmin_auth');
        setPasswordInput('');
    };

    if (!isAuthenticated) {
        return (
            <div className="center-content" style={{ background: 'var(--bg-app)' }}>
                <Head><title>Admin Login</title></Head>
                <div className="glass-panel" style={{ padding: '60px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 80, height: 80, background: 'var(--accent)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', boxShadow: '0 0 30px var(--accent-glow)' }}>
                         <Brain size={40} color="black" />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>SuperAdmin</h1>
                    <p style={{ opacity: 0.6, marginBottom: '30px', color: 'var(--text-secondary)' }}>Enter your master credentials to access the core.</p>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <input
                            type="password"
                            placeholder="Master Key"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                        />
                        {authError && <div style={{ color: 'var(--error)', fontSize: '0.9rem', marginTop: '-10px' }}>Access Denied</div>}
                        <button type="submit" className="btn-primary" style={{ padding: '16px', borderRadius: '12px', background: 'var(--accent)', color: 'black', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px var(--accent-glow)' }}>Authenticate</button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div className="center-content" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>Loading System Data...</div>;

    const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="dashboard-container">
            <Head><title>SuperAdmin Dashboard</title></Head>

            {/* Left Sidebar */}
            <aside className="sidebar-left glass-panel-dark">
                <div className="sidebar-header">
                    <div className="logo-circle">
                        <Brain size={24} color="white" />
                    </div>
                    <span className="logo-text">GameStars</span>
                </div>

                <nav className="sidebar-nav">
                    <div className={`nav-item ${!selectedTenant ? 'active' : ''}`} onClick={() => setSelectedTenant(null)}>
                        <div className="nav-icon"><Grid size={20} /></div>
                        <span>Tenants</span>
                    </div>
                    <div className="nav-item">
                         <div className="nav-icon"><Activity size={20} /></div>
                         <span>Activity</span>
                    </div>
                    <div className="nav-item">
                        <div className="nav-icon"><Settings size={20} /></div>
                        <span>System</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                       <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-header">
                     <div className="search-bar">
                         <Search size={18} style={{ marginRight: 10, opacity: 0.5, color: 'var(--text-secondary)' }} />
                         <input
                            type="text"
                            placeholder="Search Tenants..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                         />
                     </div>
                     <div className="header-actions">
                         <div className="badge admin"><Shield size={12} /> SuperAdmin</div>
                     </div>
                </header>

                <div className="scrollable-content">
                    {/* View: Tenant List */}
                    {!selectedTenant && (
                        <>
                            <div className="hero-banner glass-panel">
                                <div className="hero-content">
                                    <h1>System Overview</h1>
                                    <p>Manage {tenants.length} Active Workspaces across the platform.</p>
                                    <button className="hero-btn" onClick={() => setIsCreating(true)}>
                                         <PlusCircle size={18} style={{ marginRight: 8 }}/> Create Tenant
                                    </button>
                                </div>
                                <div className="hero-decorative" />
                            </div>

                            {/* Creation Panel */}
                            {isCreating && (
                                <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px', border: '1px solid var(--accent)', animation: 'slideIn 0.3s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>New Tenant Workspace</h3>
                                        <button onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', opacity: 0.7, fontSize: '0.9rem' }}>Workspace Name</label>
                                            <input
                                                className="input-field"
                                                placeholder="e.g. Design Team"
                                                value={newTenant.name}
                                                onChange={e => setNewTenant({...newTenant, name: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', opacity: 0.7, fontSize: '0.9rem' }}>URL Slug</label>
                                            <input
                                                className="input-field"
                                                placeholder="e.g. design-team"
                                                value={newTenant.slug}
                                                onChange={e => setNewTenant({...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                            />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ display: 'flex', gap: '20px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <CustomSelect
                                                        label="Visibility"
                                                        value={newTenant.visibility}
                                                        onChange={(val) => setNewTenant({...newTenant, visibility: val})}
                                                        options={[
                                                            { label: 'Public (Open)', value: 'public', icon: Globe },
                                                            { label: 'Private (Invite Only)', value: 'private', icon: Lock }
                                                        ]}
                                                    />
                                                </div>
                                                {newTenant.visibility === 'private' && (
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', marginBottom: '8px', opacity: 0.7, fontSize: '0.85rem', fontWeight: 500, paddingLeft: '4px' }}>Access Code</label>
                                                        <input
                                                            className="input-field"
                                                            placeholder="e.g. 1234"
                                                            value={newTenant.accessCode || ''}
                                                            onChange={e => setNewTenant({...newTenant, accessCode: e.target.value})}
                                                            style={{ height: '48px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn-primary" onClick={createTenant}>
                                        <Save size={18} style={{ marginRight: 8 }} /> Save Workspace
                                    </button>
                                </div>
                            )}

                            <div className="section-header">
                                <h2>Active Tenants</h2>
                                <span className="view-all">Sort by Name</span>
                            </div>

                            <div className="games-grid">
                                {filteredTenants.map(t => (
                                    <div key={t.tenant_id} className="glass-panel game-card-premium" onClick={() => handleSelectTenant(t)} style={{ cursor: 'pointer' }}>
                                        <div className="card-image-area" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, opacity: 0.3, color: 'white' }}>{t.slug ? t.slug.substring(0,2).toUpperCase() : '??'}</div>
                                        </div>
                                        <div className="card-content-area">
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{t.name}</h3>
                                            <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '15px' }}>/{t.slug}</p>
                                            <div style={{ marginTop: 'auto', display: 'flex', gap: '5px' }}>
                                                <span className="badge-pill">{t.type}</span>
                                                <span className="badge-pill">{t.visibility}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* View: Selected Tenant Details */}
                    {selectedTenant && (
                        <div className="detail-view">
                            <button className="back-btn" onClick={() => setSelectedTenant(null)}>
                                <ArrowLeft size={18} /> Back to Tenants
                            </button>

                            <div className="hero-banner glass-panel" style={{ minHeight: '180px', marginBottom: '20px' }}>
                                <div className="hero-content">
                                    <h1>{selectedTenant.name}</h1>
                                    <p>/{selectedTenant.slug} • {tenantUsers.length} Users</p>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <a href={`/${selectedTenant.slug}`} target="_blank" className="hero-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                            Launch Interface ↗
                                        </a>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: '200px' }}>
                                                <CustomSelect
                                                    value={selectedTenant.visibility}
                                                    onChange={(val) => updateTenantSettings({ visibility: val })}
                                                    options={[
                                                        { label: 'Public', value: 'public', icon: Globe },
                                                        { label: 'Private', value: 'private', icon: Lock }
                                                    ]}
                                                />
                                            </div>
                                            {selectedTenant.visibility === 'private' && (
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        background: 'var(--bg-surface-secondary)',
                                                        padding: '12px 16px', borderRadius: '12px',
                                                        border: '1px solid var(--border-subtle)',
                                                        height: '46px' // Match select height roughly
                                                    }}>
                                                        <Lock size={16} style={{ opacity: 0.5 }} />
                                                        <input
                                                            value={selectedTenant.access_code || ''}
                                                            onChange={(e) => setSelectedTenant({...selectedTenant, access_code: e.target.value})}
                                                            onBlur={() => updateTenantSettings({ access_code: selectedTenant.access_code })}
                                                            placeholder="Set Code"
                                                            style={{
                                                                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                                                width: '100px', fontSize: '0.95rem', fontWeight: 'bold', letterSpacing: '1px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ position: 'absolute', top: '-20px', left: '0', fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Access Code</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                 {/* Allowed Games */}
                                <div className="glass-panel" style={{ padding: '25px' }}>
                                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={18} /> Allowed Games</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {GAMES.map(g => {
                                        const isEnabled = (selectedTenant.allowed_games || []).includes(g.id);
                                        return (
                                            <div key={g.id} onClick={() => toggleGame(g.id)} className={`toggle-row ${isEnabled ? 'on' : 'off'}`}>
                                                <span>{g.name}</span>
                                                {isEnabled ? <Check size={18} /> : <X size={18} />}
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>

                                {/* Users */}
                                <div className="glass-panel" style={{ padding: '25px' }}>
                                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={18} /> User Management</h3>
                                    <div className="users-list">
                                        {tenantUsers.map(u => (
                                            <div key={u.id} className="user-row">
                                                <div className="user-info">
                                                    <div className="u-name">{u.username}</div>
                                                    <div className="u-sub">{new Date(u.lastOnline).toLocaleDateString()}</div>
                                                </div>
                                                <div style={{ width: '130px' }}>
                                                    <CustomSelect
                                                        value={u.role}
                                                        onChange={(val) => updateUserRole(u.id, val)}
                                                        options={[
                                                            { label: 'Player', value: 'player' },
                                                            { label: 'Admin', value: 'admin' },
                                                            { label: 'Super', value: 'superadmin' }
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Right Sidebar */}
             <aside className="sidebar-right">
                <div className="glass-panel profile-widget">
                     <div className="profile-banner" style={{ background: 'var(--bg-gradient)' }} />
                     <div className="profile-content-center">
                         <div className="profile-big-avatar" style={{ background: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Shield size={40} color="black" />
                         </div>
                         <h3>SuperAdmin</h3>
                         <span className="profile-tag">System Root</span>
                     </div>
                </div>

                <div className="section-header small" style={{ marginTop: '20px', marginBottom: '10px' }}>
                    <h3>{selectedTenant ? `${selectedTenant.name} Users` : 'Recent Logs'}</h3>
                </div>

                {selectedTenant ? (
                     <div className="teammates-list-sidebar" style={{ flex: 1, overflowY: 'auto' }}>
                        {tenantUsers.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>No users in this workspace.</div>
                        ) : (
                            tenantUsers.map(u => (
                                <div key={u.id} className="glass-panel" style={{ marginBottom: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '12px', background: 'var(--bg-card)' }}>
                                     <img src={u.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${u.username}`} style={{ width: 32, height: 32, borderRadius: 8, background: '#333' }} />
                                     <div style={{ flex: 1, minWidth: 0 }}>
                                         <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                             {u.username}
                                         </div>
                                         <div style={{ fontSize: '0.75rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                             {u.role === 'admin' && <span style={{ color: 'var(--accent)' }}>Admin</span>}
                                             {/* <span>{new Date(u.lastOnline).toLocaleDateString()}</span> */}
                                         </div>
                                     </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="news-card glass-panel" style={{ opacity: 0.7 }}>
                        <div style={{ fontSize: '0.8rem' }}>System initialized. Waiting for actions...</div>
                    </div>
                )}
            </aside>

            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`}>
                    {toast.msg}
                </div>
            )}

            <style jsx>{`
                .dashboard-container {
                    display: grid;
                    grid-template-columns: 260px 1fr 300px;
                    height: 100vh;
                    overflow: hidden;
                    background: var(--bg-app);
                    color: var(--text-primary);
                    font-family: 'Inter', sans-serif;
                    transition: background 0.3s ease, color 0.3s ease;
                }

                /* Sidebar Left */
                .sidebar-left {
                    background: var(--bg-panel);
                    border-right: 1px solid var(--border-subtle);
                    display: flex;
                    flex-direction: column;
                    padding: 20px;
                }
                .sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 40px;
                    padding-left: 10px;
                }
                .logo-circle {
                    width: 40px; height: 40px;
                    background: var(--accent);
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 0 20px var(--accent-glow);
                }
                .logo-text { font-size: 1.2rem; font-weight: 700; letter-spacing: 1px; color: var(--text-primary); }

                .sidebar-nav { display: flex; flex-direction: column; gap: 10px; margin-bottom: 40px; }
                .nav-item {
                    display: flex; align-items: center; gap: 15px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    cursor: pointer;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                    font-weight: 500;
                }
                .nav-item:hover, .nav-item.active {
                    background: var(--bg-surface-secondary);
                    color: var(--text-primary);
                }
                .nav-item.active { border-left: 3px solid var(--accent); }

                .sidebar-footer { margin-top: auto; }
                .logout-btn {
                    display: flex; align-items: center; gap: 10px;
                    background: none; border: none; color: var(--error);
                    cursor: pointer; padding: 10px; opacity: 0.7;
                    transition: opacity 0.2s;
                    font-weight: 600;
                }
                .logout-btn:hover { opacity: 1; }

                /* Main Content */
                .main-content {
                    display: flex; flex-direction: column;
                    padding: 0 40px;
                    overflow: hidden;
                }
                .top-header {
                    height: 80px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .search-bar {
                    display: flex; align-items: center;
                    background: var(--bg-surface-secondary);
                    padding: 0 20px; border-radius: 20px;
                    width: 300px;
                    border: 1px solid var(--border-subtle);
                }
                .search-bar input {
                    background: transparent;
                    border: none; padding: 12px 0;
                    color: var(--text-primary); width: 100%; outline: none;
                }
                .scrollable-content {
                    flex: 1; overflow-y: auto; padding-bottom: 40px;
                }
                .scrollable-content::-webkit-scrollbar { display: none; }

                .hero-banner {
                    min-height: 200px;
                    border-radius: 24px;
                    background: var(--bg-gradient);
                    position: relative;
                    padding: 40px;
                    display: flex;
                    align-items: center;
                    margin-bottom: 40px;
                    overflow: hidden;
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-lg);
                }
                .hero-content { position: relative; z-index: 2; max-width: 60%; }
                .hero-content h1 { font-size: 2.2rem; margin-bottom: 10px; background: linear-gradient(to right, var(--text-primary), var(--text-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-content p { opacity: 0.7; margin-bottom: 25px; color: var(--text-secondary); }
                .hero-btn {
                    background: var(--accent);
                    color: black; border: none; padding: 12px 30px;
                    border-radius: 8px; font-weight: 700; cursor: pointer;
                    box-shadow: 0 4px 15px var(--accent-glow);
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                }
                .hero-btn:hover { transform: translateY(-2px); }

                .section-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 20px;
                }
                .section-header h2 { font-size: 1.2rem; font-weight: 600; color: var(--text-primary); }
                .view-all { font-size: 0.9rem; opacity: 0.6; cursor: pointer; color: var(--text-secondary); }

                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                }

                /* Right Sidebar & Panels */
                .sidebar-right {
                    padding: 30px;
                    border-left: 1px solid var(--border-subtle);
                    background: var(--bg-panel);
                    display: flex; flex-direction: column;
                }
                .profile-widget { padding: 0; overflow: hidden; margin-bottom: 40px; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-subtle); }
                .profile-banner { height: 80px; width: 100%; }
                .profile-content-center { padding: 20px; display: flex; flex-direction: column; align-items: center; margin-top: -50px; }
                .profile-big-avatar { width: 80px; height: 80px; border-radius: 20px; border: 4px solid var(--bg-card); margin-bottom: 10px; }
                .profile-tag { font-size: 0.9rem; color: var(--text-secondary); }

                /* Reuse Previous Styles */
                .glass-panel {
                    background: var(--bg-panel);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                }
                .glass-panel-dark { background: var(--bg-panel); backdrop-filter: blur(20px); }

                .game-card-premium {
                    display: flex; flex-direction: column; overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                }
                .game-card-premium:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .card-image-area { height: 100px; display: flex; align-items: center; justify-content: center; }
                .card-content-area { padding: 20px; flex: 1; display: flex; flex-direction: column; }
                .badge-pill {
                    padding: 4px 10px; border-radius: 20px; font-size: 0.7rem;
                    background: var(--bg-surface-secondary); color: var(--text-secondary); border: 1px solid var(--border-subtle);
                    text-transform: uppercase; letter-spacing: 0.5px;
                }

                .input-field {
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid var(--border-subtle);
                    background: var(--bg-surface-secondary);
                    color: var(--text-primary);
                    outline: none;
                }
                .input-field:focus { border-color: var(--accent); }

                /* Details View */
                .back-btn { background: none; border: none; color: var(--text-primary); display: flex; gap: 10px; margin-bottom: 20px; cursor: pointer; opacity: 0.7; }
                .back-btn:hover { opacity: 1; }
                .toggle-row { display: flex; justify-content: space-between; padding: 12px; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s; }
                .toggle-row.on { background: rgba(59, 130, 246, 0.1); border: 1px solid var(--primary); color: var(--primary); }
                .toggle-row.off { background: var(--bg-surface-secondary); border: 1px solid transparent; opacity: 0.7; color: var(--text-secondary); }

                .users-list { max-height: 400px; overflow-y: auto; }
                .user-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
                .u-name { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
                .u-sub { font-size: 0.75rem; color: var(--text-secondary); }
                .role-select { background: var(--bg-surface-secondary); color: var(--text-primary); border: 1px solid var(--border-subtle); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }

                .badge.admin { display: flex; align-items: center; gap: 5px; color: #facc15; background: rgba(234, 179, 8, 0.1); padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; }
                .toast { position: fixed; bottom: 30px; right: 30px; padding: 15px 25px; border-radius: 8px; font-weight: 600; animation: slideIn 0.3s; color: white; }
                .toast.success { background: var(--success); }
                .toast.error { background: var(--error); }

                @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
