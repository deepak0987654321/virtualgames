import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { PlusCircle, LogOut, Trophy, Moon, Sun, Brain, Settings, Grid, Clock, X, ArrowRight, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GAMES } from '../../lib/gameConfig';
import GameCard from '../../components/game/GameCard';
import RulesModal from '../../components/game/RulesModal';

export default function TenantLobby() {
    const router = useRouter();
    const { slug } = router.query;
    const { user, logout } = useAuth();
    const [theme, setTheme] = useState('dark');
    const [tenant, setTenant] = useState<any>(null);
    const [viewingRules, setViewingRules] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    // Toggle Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Fetch Tenant Data & Users
    useEffect(() => {
        if (!slug) return;

        // Fetch Users
        fetch(`/api/tenant/${slug}/users/public`)
            .then(res => res.json())
            .then(data => setOnlineUsers(data.users || []))
            .catch(err => console.error("Failed to fetch users", err));

        // Fetch Tenant Details (Placeholder logic if needed, usually passed in props or separate endpoint)
    }, [slug]);

    useEffect(() => {
        if (!user && !localStorage.getItem('session_token')) {
            router.push(`/${slug}`);
        }
    }, [user, slug]);

    if (!user) return (
        <div className="center-content">
            <div className="countdown-ring" />
            <p style={{ marginTop: '20px' }}>Loading Lobby...</p>
        </div>
    );

    const isAdmin = user.role === 'admin' || (user.role as string) === 'superadmin';
    const workspaceName = tenant?.name || (slug as string)?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
                    <div className="nav-item active">
                        <div className="nav-icon"><Grid size={20} /></div>
                        <span>Lobby</span>
                    </div>
                    <div className="nav-item" onClick={() => router.push(`/${slug}/leaderboard`)}>
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
                         <input type="text" placeholder="Search games..." />
                     </div>
                     <div className="header-actions">
                         <button className="icon-btn" onClick={toggleTheme}>
                             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                         </button>
                     </div>
                </header>

                <div className="scrollable-content">
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                         {/* Hero / Welcome */}
                         <div style={{ marginBottom: '40px', marginTop: '20px' }}>
                             <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>
                                 {isAdmin ? 'Start a Session' : 'Game Library'}
                             </h1>
                             <p style={{ color: 'var(--text-secondary)' }}>
                                 {isAdmin
                                    ? 'Select a game mode to launch for your team.'
                                    : 'Explore our collection while you wait for the host to start.'}
                             </p>
                         </div>

                         {/* Games Grid (3 in Column) */}
                         <div className="game-grid-layout">
                             {GAMES.map(g => (
                                 <GameCard
                                    key={g.id}
                                    game={g}
                                    isAdmin={isAdmin}
                                    onPlay={() => router.push(`/${slug}/create-room?game=${g.id}`)}
                                    onViewRules={(e) => { e.stopPropagation(); setViewingRules(g); }}
                                 />
                             ))}
                         </div>
                    </div>
                </div>
            </main>

            {/* Right Sidebar - ONLINE TEAMMATES for ALL ROLES */}
             <aside className="sidebar-right">
                {/* Profile Widget */}
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

                {/* Online Teammates Section */}
                <div className="section-header small" style={{ marginTop: '20px', marginBottom: '10px' }}>
                    <h3>Online Teammates <span style={{ opacity: 0.5, marginLeft: 5 }}>({onlineUsers.length})</span></h3>
                </div>

                <div className="teammates-list-sidebar">
                    {onlineUsers.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>No one else is online.</div>
                    ) : (
                        onlineUsers.map(u => (
                            <div key={u.id} className="teammate-row glass-panel" style={{ marginBottom: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '12px' }}>
                                 <img src={u.avatar} style={{ width: 32, height: 32, borderRadius: 8, background: '#333' }} />
                                 <div style={{ flex: 1, minWidth: 0 }}>
                                     <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                         {u.username} {u.id === user.id && '(You)'}
                                     </div>
                                     <div style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                         <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> Online
                                         {u.role === 'admin' && <span style={{ color: 'var(--accent)' }}>• Admin</span>}
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
                    grid-template-columns: 260px 1fr 300px; /* Adjusted right sidebar width */
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
                    flex-direction: column; /* Changed to column to match layout */
                    justify-content: center;
                    margin-bottom: 40px;
                    overflow: hidden;
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-lg);
                }
                .hero-content { position: relative; z-index: 2; max-width: 60%; }
                .hero-content h1 { font-size: 2.5rem; margin-bottom: 10px; line-height: 1.2; background: linear-gradient(to right, var(--text-primary), var(--text-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-content p { opacity: 0.8; margin-bottom: 25px; color: var(--text-secondary); }
                .hero-btn {
                    background: var(--accent);
                    color: black; border: none; padding: 12px 30px;
                    border-radius: 8px; font-weight: 700; cursor: pointer;
                    box-shadow: 0 4px 15px var(--accent-glow);
                    transition: transform 0.2s;
                    font-family: var(--font-heading);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .hero-btn:hover { transform: scale(1.05); }

                .section-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 20px;
                }
                .section-header h2 { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
                .view-all { font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; }

                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                }

                .badge-pill {
                    padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
                    display: inline-flex; align-items: center; gap: 4px; border: 1px solid transparent;
                }
                .badge-pill.admin { background: rgba(234, 179, 8, 0.1); color: #facc15; border-color: rgba(234, 179, 8, 0.3); }

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
                    /* Custom Scrollbar for sidebar list */
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

                .btn-create.full-width { width: 100%; background: var(--accent); color: black; border: none; }

                .game-card-lobby {
                    background: var(--bg-surface-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    height: 280px;
                }
                .game-card-lobby:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
                    border-color: var(--accent);
                }
                .gc-image {
                    height: 160px;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                }
                .gc-image img {
                    width: 100%; height: 100%; object-fit: cover;
                    transition: transform 0.5s;
                }
                .game-card-lobby:hover .gc-image img { transform: scale(1.1); }
                .gc-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%);
                }
                .gc-icon {
                    position: absolute; bottom: 12px; left: 12px;
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(5px);
                    padding: 8px; border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                .gc-info {
                    padding: 20px;
                    flex: 1; display: flex; flex-direction: column;
                }
                .gc-info h3 { margin-bottom: 5px; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-top: 0; }
                .gc-info p { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 15px; }
                .play-btn {
                    margin-top: auto;
                    color: var(--accent);
                    font-weight: 600;
                    display: flex; align-items: center; gap: 5px;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }


            `}</style>

            {/* Rules Modal */}
            <RulesModal
                game={viewingRules}
                isOpen={!!viewingRules}
                onClose={() => setViewingRules(null)}
                isAdmin={isAdmin}
                userRole={user?.role}
                onPlay={() => {
                    setViewingRules(null);
                    router.push(`/${slug}/create-room?game=${viewingRules.id}`);
                }}
            />
        </div>
    );
}
