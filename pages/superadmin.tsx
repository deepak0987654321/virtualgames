import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    Users,
    Settings,
    Shield,
    Globe,
    Lock,
    Search,
    Plus,
    Trash2,
    ChevronRight,
    BarChart3,
    ArrowLeft,
    Box,
    CheckCircle2,
    XCircle
} from 'lucide-react';



export default function SuperAdminPortal() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [view, setView] = useState('dashboard'); // 'dashboard', 'tenants', 'users'
    const [tenants, setTenants] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Persistence for auth
    useEffect(() => {
        const savedKey = sessionStorage.getItem('admin_key');
        if (savedKey) {
            // Try to validate the saved key
            const validate = async () => {
                const res = await fetch('/api/admin/metrics', {
                    headers: { 'x-admin-key': savedKey }
                });
                if (res.ok) {
                    setIsAuthenticated(true);
                    fetchTenants();
                } else {
                    sessionStorage.removeItem('admin_key');
                }
            }
            validate();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/metrics', {
                headers: { 'x-admin-key': password }
            });

            if (res.ok) {
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_key', password);
                const data = await res.json();
                // We can use the already fetched metrics if needed
                fetchTenants(); // This will use the key from sessionStorage now
            } else {
                setError('Invalid Admin Key');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/superadmin/tenants', {
                headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' }
            });
            const data = await res.json();
            if (data.tenants) setTenants(data.tenants);
        } catch (e) {
            console.error('Failed to fetch tenants');
        } finally {
            setLoading(false);
        }
    };

    const fetchTenantUsers = async (tenantId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/tenant/${tenantId}/users`, {
                headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' }
            });
            const data = await res.json();
            if (data.users) setTenantUsers(data.users);
        } catch (e) {
            console.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        try {
            await fetch(`/api/superadmin/user/${userId}/role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': ADMIN_KEY
                },
                body: JSON.stringify({ role: newRole })
            });
            // Update local state
            setTenantUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            console.error('Failed to update role');
        }
    };

    const handleDeleteUser = async (slug: string, userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetch(`/api/tenant/${slug}/user/${userId}`, {
                method: 'DELETE'
            });
            setTenantUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            console.error('Failed to delete user');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className="admin-login-wrapper">
                <Head><title>Admin Login | VirtualGames</title></Head>
                <div className="glass-panel admin-login-card">
                    <div className="logo" style={{ marginBottom: '30px' }}>
                        <Box size={32} color="var(--accent)" />
                        <span>SuperAdmin Portal</span>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label>Master Access Key</label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter admin key..."
                                autoFocus
                            />
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                            Access Dashboard
                        </button>
                    </form>
                </div>
                <style jsx>{`
                    .admin-login-wrapper {
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--bg-app);
                        padding: 20px;
                    }
                    .admin-login-card {
                        width: 100%;
                        max-width: 400px;
                        padding: 40px;
                        text-align: center;
                    }
                    .input-group {
                        text-align: left;
                        margin-bottom: 20px;
                    }
                    .input-group label {
                        display: block;
                        margin-bottom: 8px;
                        font-size: 0.85rem;
                        color: var(--text-secondary);
                    }
                    .error-text {
                        color: var(--error);
                        font-size: 0.85rem;
                        margin-top: 10px;
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="admin-layout">
            <Head><title>SuperAdmin Dashboard | VirtualGames</title></Head>

            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <Box size={24} color="var(--accent)" />
                    <span>VirtualGames</span>
                </div>

                <nav className="sidebar-nav">
                    <div
                        className={`nav-link ${view === 'dashboard' ? 'active' : ''}`}
                        onClick={() => { setView('dashboard'); setSelectedTenant(null); }}
                    >
                        <LayoutDashboard size={20} />
                        <span>Overview</span>
                    </div>
                    <div
                        className={`nav-link ${view === 'tenants' || selectedTenant ? 'active' : ''}`}
                        onClick={() => { setView('tenants'); setSelectedTenant(null); }}
                    >
                        <Globe size={20} />
                        <span>Tenants</span>
                    </div>
                    <div className="nav-link">
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </div>
                    <div className="nav-link">
                        <Settings size={20} />
                        <span>Global Settings</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar-small"><Shield size={16} /></div>
                        <div className="user-info">
                            <span className="username">Super Admin</span>
                            <span className="user-role">Master Access</span>
                        </div>
                    </div>
                    <button className="logout-btn-small" onClick={() => {
                        sessionStorage.removeItem('admin_key');
                        setIsAuthenticated(false);
                    }}>Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-left">
                        {selectedTenant ? (
                            <button className="back-btn" onClick={() => setSelectedTenant(null)}>
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <h1>{view.charAt(0).toUpperCase() + view.slice(1)}</h1>
                        )}
                        {selectedTenant && <h1>{selectedTenant.name} <span className="slug-badge">{selectedTenant.slug}</span></h1>}
                    </div>
                    <div className="header-right">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    {view === 'dashboard' && !selectedTenant && (
                        <div className="dashboard-view">
                            <div className="stats-grid">
                                <div className="stat-card glass-panel">
                                    <div className="stat-icon" style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent)' }}>
                                        <Globe size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Tenants</span>
                                        <span className="stat-value">{tenants.length}</span>
                                    </div>
                                </div>
                                <div className="stat-card glass-panel">
                                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)' }}>
                                        <Users size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Active Users</span>
                                        <span className="stat-value">{tenants.length * 4}</span> {/* Mocked */}
                                    </div>
                                </div>
                                <div className="stat-card glass-panel">
                                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                        <BarChart3 size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Daily Sessions</span>
                                        <span className="stat-value">124</span> {/* Mocked */}
                                    </div>
                                </div>
                            </div>

                            <div className="recent-section">
                                <div className="section-header">
                                    <h2>Recently Created Tenants</h2>
                                    <button className="btn-small" onClick={() => setView('tenants')}>View All</button>
                                </div>
                                <div className="tenants-list">
                                    {tenants.slice(0, 5).map(t => (
                                        <div key={t.tenant_id} className="tenant-row-dashboard glass-panel" onClick={() => {
                                            setSelectedTenant(t);
                                            fetchTenantUsers(t.tenant_id);
                                        }}>
                                            <div className="t-info">
                                                <span className="t-name">{t.name}</span>
                                                <span className="t-slug">{t.slug}</span>
                                            </div>
                                            <div className="t-meta">
                                                <span className={`badge-visibility ${t.visibility}`}>
                                                    {t.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                                                    {t.visibility}
                                                </span>
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {(view === 'tenants' || selectedTenant) && (
                        <div className="tenants-view">
                            {!selectedTenant ? (
                                <div className="tenants-table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Tenant Name</th>
                                                <th>Slug</th>
                                                <th>Visibility</th>
                                                <th>Created At</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTenants.map(t => (
                                                <tr key={t.tenant_id}>
                                                    <td>
                                                        <div className="tenant-cell">
                                                            <div className="avatar-placeholder">{t.name.charAt(0)}</div>
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </td>
                                                    <td><code>/{t.slug}</code></td>
                                                    <td>
                                                        <span className={`badge-visibility ${t.visibility}`}>
                                                            {t.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                                                            {t.visibility}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <button className="icon-btn-admin" onClick={() => {
                                                            setSelectedTenant(t);
                                                            fetchTenantUsers(t.tenant_id);
                                                        }} title="View Users">
                                                            <Users size={16} />
                                                        </button>
                                                        <button className="icon-btn-admin" onClick={() => router.push(`/${t.slug}`)} title="Visit Workspace">
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="tenant-detail-view">
                                    <div className="detail-header">
                                        <h2>Registered Users</h2>
                                        <div className="pill-container">
                                            <span className="pill">Total: {tenantUsers.length}</span>
                                        </div>
                                    </div>

                                    <div className="users-table-wrapper">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Role</th>
                                                    <th>Device ID</th>
                                                    <th>Last Online</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tenantUsers.map(u => (
                                                    <tr key={u.id}>
                                                        <td>
                                                            <div className="user-cell">
                                                                <img src={u.avatar} alt="" />
                                                                <div className="u-info">
                                                                    <span className="u-name">{u.username}</span>
                                                                    <span className="u-id">ID: {u.id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="role-select"
                                                                value={u.role}
                                                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                                            >
                                                                <option value="player">Player</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </td>
                                                        <td><code className="device-code">{u.deviceId?.substring(0, 10)}...</code></td>
                                                        <td>{u.lastOnline ? new Date(u.lastOnline).toLocaleString() : 'Never'}</td>
                                                        <td>
                                                            <button
                                                                className="icon-btn-admin danger"
                                                                onClick={() => handleDeleteUser(selectedTenant.slug, u.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {tenantUsers.length === 0 && !loading && (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                            No users found for this tenant.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .admin-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    height: 100vh;
                    background: #0a0b10;
                    color: white;
                    font-family: 'Inter', sans-serif;
                }

                /* Sidebar */
                .admin-sidebar {
                    background: #11131a;
                    border-right: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 30px;
                }
                .sidebar-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 40px;
                }
                .sidebar-nav {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 15px;
                    border-radius: 10px;
                    color: #8b8d97;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                }
                .nav-link:hover, .nav-link.active {
                    background: rgba(34, 211, 238, 0.1);
                    color: var(--accent);
                }
                .sidebar-footer {
                    margin-top: auto;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 15px;
                }
                .avatar-small {
                    width: 32px;
                    height: 32px;
                    background: var(--accent);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: black;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                }
                .username { font-size: 0.9rem; font-weight: 600; }
                .user-role { font-size: 0.75rem; color: #8b8d97; }
                .logout-btn-small {
                    background: none;
                    border: none;
                    color: var(--error);
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.8;
                }

                /* Main */
                .admin-main {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .admin-header {
                    height: 80px;
                    padding: 0 40px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    background: #0e0f16;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .header-left h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .slug-badge {
                    font-size: 0.8rem;
                    font-weight: 500;
                    background: rgba(255,255,255,0.05);
                    padding: 4px 10px;
                    border-radius: 6px;
                    color: var(--accent);
                    font-family: monospace;
                }
                .back-btn {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 10px 15px;
                    border-radius: 12px;
                    width: 300px;
                }
                .search-box input {
                    background: none;
                    border: none;
                    color: white;
                    outline: none;
                    width: 100%;
                }

                .admin-content {
                    flex: 1;
                    padding: 40px;
                    overflow-y: auto;
                }

                /* Dashboard */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .stat-card {
                    padding: 25px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .stat-label { font-size: 0.85rem; color: #8b8d97; }
                .stat-value { font-size: 1.8rem; font-weight: 800; }

                .recent-section h2 {
                    font-size: 1.1rem;
                    margin-bottom: 20px;
                }
                .tenants-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .tenant-row-dashboard {
                    padding: 15px 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .tenant-row-dashboard:hover {
                    transform: translateX(5px);
                    border-color: var(--accent);
                }
                .t-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .t-name { font-weight: 600; }
                .t-slug { font-size: 0.75rem; color: #8b8d97; }
                .t-meta {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                /* Table */
                .tenants-table-wrapper, .users-table-wrapper {
                    background: #11131a;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                    overflow: hidden;
                }
                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .admin-table th {
                    text-align: left;
                    padding: 15px 25px;
                    background: rgba(255,255,255,0.02);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: #8b8d97;
                    font-weight: 700;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .admin-table td {
                    padding: 15px 25px;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    font-size: 0.9rem;
                }
                .tenant-cell, .user-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    background: #2a2b35;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: var(--accent);
                }
                .user-cell img {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: #2a2b35;
                }
                .u-info {
                    display: flex;
                    flex-direction: column;
                }
                .u-name { font-weight: 600; }
                .u-id { font-size: 0.7rem; color: #8b8d97; }

                .badge-visibility {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .badge-visibility.public { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .badge-visibility.private { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

                .icon-btn-admin {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    margin-right: 5px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .icon-btn-admin:hover { background: rgba(255,255,255,0.1); color: var(--accent); }
                .icon-btn-admin.danger:hover { color: var(--error); background: rgba(239, 68, 68, 0.1); }

                .role-select {
                    background: #1a1c26;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    outline: none;
                }
                .device-code {
                    color: #8b8d97;
                    font-family: monospace;
                    font-size: 0.8rem;
                }

                .tenant-detail-view h2 {
                    margin-bottom: 25px;
                    font-size: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .pill {
                    background: var(--accent);
                    color: black;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 0.8rem;
                }
            `}</style>
        </div>
    );
}
