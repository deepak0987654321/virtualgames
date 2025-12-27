import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, Grid, LogOut, Sun, Moon, Crown, Brain } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function LeaderboardPage() {
    const router = useRouter();
    const { slug } = router.query;
    const { user, logout } = useAuth();
    const [theme, setTheme] = useState('dark');
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    // Theme Logic
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
    }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Data Fetching
    useEffect(() => {
        if (!slug) return;

        // Fetch Leaderboard
        fetch(`/api/tenant/${slug}/leaderboard`)
            .then(res => res.json())
            .then(data => {
                setPlayers(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));

        // Fetch Online Users (for consistency)
        fetch(`/api/tenant/${slug}/users/public`)
            .then(res => res.json())
            .then(data => setOnlineUsers(data.users || []))
            .catch(err => console.error(err));
    }, [slug]);

    if (!user) return <div className="center-content">Loading...</div>;

    const workspaceName = (slug as string)?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <div className="dashboard-container">
            {/* Left Sidebar */}
            <aside className="sidebar-left glass-panel-dark">
                <div className="sidebar-header">
                    <div className="logo-circle">
                         <Brain size={24} color="white" />
                    </div>
                    <span className="logo-text">GameStars</span>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-item" onClick={() => router.push(`/${slug}/lobby`)}>
                        <div className="nav-icon"><Grid size={20} /></div>
                        <span>Lobby</span>
                    </div>
                    <div className="nav-item active">
                        <div className="nav-icon"><Trophy size={20} /></div>
                        <span>Leaderboard</span>
                    </div>
                </nav>

                <div className="sidebar-section">
                    <h3>My Teams</h3>
                    <div className="team-item active">
                        <div className="team-color" style={{ background: 'var(--accent)' }} />
                        <div className="team-info">
                            <span className="team-name">{workspaceName}</span>
                            <span className="team-status">Online</span>
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={() => logout(`/${slug}`)}>
                       <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-header">
                     <div className="search-bar">
                         <input type="text" placeholder="Search players..." />
                     </div>
                     <div className="header-actions">
                         <button className="icon-btn" onClick={toggleTheme}>
                             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                         </button>
                     </div>
                </header>

                <div className="scrollable-content">
                    <div className="hero-banner glass-panel" style={{ minHeight: '180px', marginBottom: '30px' }}>
                        <div className="hero-content">
                             <div className="badge-pill mb-4" style={{ marginBottom: 15, background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                                <Trophy size={14} /> Season 1 Standings
                            </div>
                            <h1>Leaderboard</h1>
                            <p>Top performers in {workspaceName}. Compete in games to climb the ranks!</p>
                        </div>
                        <div className="hero-decorative" />
                    </div>

                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <table className="lb-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Games</th>
                                    <th>Stat</th>
                                    <th style={{ textAlign: 'right' }}>Total Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading data...</td></tr>
                                ) : players.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>No games played yet.</td></tr>
                                ) : (
                                    players.map((p, idx) => (
                                        <tr key={idx} style={{ background: idx < 3 ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                                            <td>
                                                <div style={{
                                                    width: 32, height: 32,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 'bold', fontSize: '1rem',
                                                    color: idx < 3 ? '#fbbf24' : 'var(--text-secondary)',
                                                    border: idx === 0 ? '2px solid #fbbf24' : 'none',
                                                    borderRadius: '50%'
                                                }}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                    <img src={p.avatar} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-subtle)' }} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {p.username}
                                                            {idx === 0 && <Crown size={14} color="#fbbf24" style={{ fill: "#fbbf24" }} />}
                                                        </div>
                                                        {idx === 0 && <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Current Champion</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{p.games_played}</td>
                                            <td>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                    {p.wins || 0} Wins
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)' }}>
                                                {p.total_score}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
             <aside className="sidebar-right">
                <div className="glass-panel profile-widget">
                     <div className="profile-banner" style={{ background: 'var(--bg-gradient)' }} />
                     <div className="profile-content-center">
                         <img src={user.avatar} className="profile-big-avatar" />
                         <h3>{user.username}</h3>
                         <span className="profile-tag">@{user.username.split(' ')[0].toLowerCase()}</span>

                         <div className="profile-stats-row">
                             <div className="p-stat">
                                 <span className="val">{user.wins || 0}</span>
                                 <span className="label">Wins</span>
                             </div>
                             <div className="p-stat">
                                 <span className="val">{(user.wins || 0) + (user.losses || 0)}</span>
                                 <span className="label">Games</span>
                             </div>
                         </div>
                     </div>
                </div>

                <div className="section-header small" style={{ marginTop: '20px', marginBottom: '10px' }}>
                    <h3>Online Teammates <span style={{ opacity: 0.5, marginLeft: 5 }}>({onlineUsers.length})</span></h3>
                </div>

                <div className="teammates-list-sidebar">
                    {onlineUsers.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>No one else is online.</div>
                    ) : (
                        onlineUsers.map(u => (
                            <div key={u.id} className="glass-panel" style={{ marginBottom: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '12px' }}>
                                 <img src={u.avatar} style={{ width: 32, height: 32, borderRadius: 8, background: '#333' }} />
                                 <div style={{ flex: 1, minWidth: 0 }}>
                                     <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                         {u.username} {u.id === user.id && '(You)'}
                                     </div>
                                     <div style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                         <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> Online
                                         {u.role === 'admin' && <span style={{ color: 'var(--accent)' }}>Admin</span>}
                                     </div>
                                 </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

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

                .sidebar-section h3 {
                    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px;
                    color: var(--text-secondary); margin-bottom: 15px; padding-left: 10px;
                    font-weight: 700;
                }
                .team-item {
                    display: flex; align-items: center; gap: 12px;
                    padding: 10px; border-radius: 12px;
                    background: var(--bg-surface-secondary);
                    border: 1px solid var(--border-subtle);
                }
                .team-color { width: 10px; height: 10px; border-radius: 50%; }
                .team-info { display: flex; flex-direction: column; }
                .team-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
                .team-status { font-size: 0.75rem; opacity: 0.7; color: var(--text-secondary); }

                .sidebar-footer { margin-top: auto; }
                .logout-btn {
                    display: flex; align-items: center; gap: 10px;
                    background: none; border: none; color: var(--error);
                    cursor: pointer; padding: 10px; opacity: 0.8;
                    font-weight: 600;
                    transition: opacity 0.2s;
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
                .search-bar input {
                    background: var(--bg-surface-secondary);
                    border: 1px solid var(--border-subtle);
                    padding: 12px 20px;
                    border-radius: 20px;
                    width: 300px; color: var(--text-primary);
                    outline: none;
                }
                .search-bar input:focus { border-color: var(--accent); }

                .icon-btn {
                    background: var(--bg-surface-secondary);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-primary);
                    width: 40px; height: 40px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .icon-btn:hover { background: var(--bg-card); transform: scale(1.05); }

                .scrollable-content {
                    flex: 1; overflow-y: auto; padding-bottom: 40px;
                }
                .scrollable-content::-webkit-scrollbar { display: none; }

                .hero-banner {
                    min-height: 250px;
                    border-radius: 24px;
                    background: var(--bg-gradient);
                    position: relative;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    margin-bottom: 40px;
                    overflow: hidden;
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-lg);
                }
                .hero-content { position: relative; z-index: 2; max-width: 60%; }
                .hero-content h1 { font-size: 2.5rem; margin-bottom: 10px; line-height: 1.2; background: linear-gradient(to right, var(--text-primary), var(--text-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-content p { opacity: 0.8; margin-bottom: 25px; color: var(--text-secondary); }

                /* Right Sidebar */
                .sidebar-right {
                    padding: 30px;
                    border-left: 1px solid var(--border-subtle);
                    background: var(--bg-panel);
                    display: flex; flex-direction: column;
                }
                .profile-widget {
                    padding: 0; overflow: hidden; margin-bottom: 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                }
                .profile-banner { height: 80px; width: 100%; }
                .profile-content-center {
                    padding: 20px; display: flex; flex-direction: column; align-items: center;
                    margin-top: -50px;
                }
                .profile-big-avatar {
                    width: 80px; height: 80px; border-radius: 20px;
                    border: 4px solid var(--bg-card); margin-bottom: 10px;
                }
                .profile-tag { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px; }
                .profile-stats-row {
                    display: flex; gap: 20px; width: 100%; justify-content: center;
                    border-top: 1px solid var(--border-subtle);
                    padding-top: 20px;
                }
                .p-stat { display: flex; flex-direction: column; align-items: center; }
                .p-stat .val { font-size: 1.2rem; font-weight: 700; color: var(--accent); }
                .p-stat .label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; }

                .teammates-list-sidebar {
                    flex: 1;
                    overflow-y: auto;
                    margin-bottom: 20px;
                }
                .teammates-list-sidebar::-webkit-scrollbar { display: none; }

                /* Reuse Previous Styles */
                .glass-panel {
                    background: var(--bg-panel);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                }
                .glass-panel-dark {
                    background: var(--bg-panel);
                    backdrop-filter: blur(20px);
                }

                .badge-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
            `}</style>
        </div>
    );
}
