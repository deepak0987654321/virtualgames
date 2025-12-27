import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Filter, Trophy, ArrowLeft, Users, Gamepad2 } from 'lucide-react';

type ViewState = 'TIER_1_HOME' | 'TIER_2_COMPANY' | 'TIER_3_PLAYERS';

export default function LeaderboardPage() {
    const [view, setView] = useState<ViewState>('TIER_1_HOME');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    // Selection State
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [selectedDetails, setSelectedDetails] = useState<{ product: string, gameType: string } | null>(null);

    // Filters for Tier 2
    const [availableFilters, setAvailableFilters] = useState<{ products: string[], gameTypes: string[] }>({ products: [], gameTypes: [] });
    const [activeFilters, setActiveFilters] = useState<{ products: string[], gameTypes: string[] }>({ products: [], gameTypes: [] });

    // --- FETCHING LOGIC ---

    const fetchTier1 = () => {
        setLoading(true);
        fetch('/api/leaderboard?view=companies')
            .then(res => res.json())
            .then(res => {
                setData(res);
                setLoading(false);
            });
    };

    const fetchTier2 = (company: string) => {
        setLoading(true);
        // Build query for filters
        const params = new URLSearchParams({ view: 'company_detail', company });
        activeFilters.products.forEach(p => params.append('products', p));
        activeFilters.gameTypes.forEach(t => params.append('gameTypes', t));

        fetch(`/api/leaderboard?${params.toString()}`)
            .then(res => res.json())
            .then(res => {
                setData(res);
                setLoading(false);
            });
    };

    const fetchFilters = (company: string) => {
        fetch(`/api/leaderboard?view=filters&company=${encodeURIComponent(company)}`)
            .then(res => res.json())
            .then(res => setAvailableFilters(res));
    };

    const fetchTier3 = (company: string, product: string, gameType: string) => {
        setLoading(true);
        const params = new URLSearchParams({
            view: 'player_rankings',
            company,
            product,
            gameType
        });
        fetch(`/api/leaderboard?${params.toString()}`)
            .then(res => res.json())
            .then(res => {
                setData(res);
                setLoading(false);
            });
    };

    // --- EFFECTS ---

    useEffect(() => {
        if (view === 'TIER_1_HOME') {
            fetchTier1();
        } else if (view === 'TIER_2_COMPANY' && selectedCompany) {
            fetchTier2(selectedCompany);
            fetchFilters(selectedCompany); // Refresh filters available
        } else if (view === 'TIER_3_PLAYERS' && selectedCompany && selectedDetails) {
            fetchTier3(selectedCompany, selectedDetails.product, selectedDetails.gameType);
        }
    }, [view, selectedCompany, selectedDetails, activeFilters]); // Refetch when filters change

    // --- HANDLERS ---

    const handleSelectCompany = (company: string) => {
        setSelectedCompany(company);
        setActiveFilters({ products: [], gameTypes: [] }); // Reset filters
        setView('TIER_2_COMPANY');
    };

    const handleSelectProductRow = (product: string, gameType: string) => {
        setSelectedDetails({ product, gameType });
        setView('TIER_3_PLAYERS');
    };

    const toggleFilter = (type: 'products' | 'gameTypes', value: string) => {
        setActiveFilters(prev => {
            const current = prev[type];
            const exists = current.includes(value);
            return {
                ...prev,
                [type]: exists ? current.filter(x => x !== value) : [...current, value]
            };
        });
    };

    // --- RENDER HELPERS ---

    const renderTable = () => {
        if (loading) return <div className="countdown-ring" style={{ margin: '50px auto' }} />;
        if (!Array.isArray(data) || data.length === 0) return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No records found.</div>;

        // TIER 1 TABLE
        if (view === 'TIER_1_HOME') {
            return (
                <table className="lb-table">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th style={{ textAlign: 'center' }}>Total Games</th>
                            <th style={{ textAlign: 'center' }}>Total Users</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                             <tr key={i}>
                                 <td><span className="company-name">{row.company}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill">{row.total_games}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill">{row.total_users}</span></td>
                                 <td style={{ textAlign: 'right' }}>
                                     <button className="btn-small" onClick={() => handleSelectCompany(row.company)}>
                                         View <ChevronRight size={14} />
                                     </button>
                                 </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        // TIER 2 TABLE
        if (view === 'TIER_2_COMPANY') {
             return (
                <table className="lb-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Game Type</th>
                            <th style={{ textAlign: 'center' }}>Total Games</th>
                            <th style={{ textAlign: 'center' }}>Total Players</th>
                            <th style={{ textAlign: 'center' }}>Total Score</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                         {data.map((row, i) => (
                             <tr key={i}>
                                 <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{row.product}</td>
                                 <td><span className="game-type-badge">{row.gameType}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill">{row.total_records}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill">{row.total_players}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="score-highlight">{(row.total_score || 0).toLocaleString()}</span></td>
                                 <td style={{ textAlign: 'right' }}>
                                     <button className="btn-small" onClick={() => handleSelectProductRow(row.product, row.gameType)}>
                                         View Ranking <ChevronRight size={14} />
                                     </button>
                                 </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        // TIER 3 TABLE
        if (view === 'TIER_3_PLAYERS') {
             return (
                <table className="lb-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Rank</th>
                            <th>Player Name</th>
                            <th style={{ textAlign: 'right' }}>Total Points</th>
                            <th style={{ textAlign: 'center' }}>Games Played</th>
                            <th style={{ textAlign: 'center' }}>Wins</th>
                        </tr>
                    </thead>
                    <tbody>
                         {data.map((row, i) => (
                             <tr key={i}>
                                 <td style={{ textAlign: 'center' }}>
                                     <div className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-default'}`}>
                                         {i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `#${i+1}`))}
                                     </div>
                                 </td>
                                 <td>
                                     <div className="player-name-cell">
                                         <img src={row.avatar || '/avatars/avator01.svg'} className="player-avatar" alt={row.username} />
                                         <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{row.username}</span>
                                     </div>
                                 </td>
                                 <td style={{ textAlign: 'right' }}>
                                     <span className="score-highlight">{(row.total_points || 0).toLocaleString()}</span>
                                 </td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill">{row.games_played}</span></td>
                                 <td style={{ textAlign: 'center' }}><span className="stat-pill" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>{row.wins || 0}</span></td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
    };

    return (
        <div key="leaderboard-v2" className="container" style={{ padding: '30px', minHeight: '100vh' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {view === 'TIER_1_HOME' ? (
                            <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
                                 <div className="icon-box"><ArrowLeft size={20} /></div>
                            </Link>
                        ) : (
                             <div className="icon-box" onClick={() => {
                                 if (view === 'TIER_3_PLAYERS') setView('TIER_2_COMPANY');
                                 else setView('TIER_1_HOME');
                             }}>
                                <ArrowLeft size={20} />
                             </div>
                        )}
                        <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>
                            {view === 'TIER_1_HOME' && 'Company Leaderboard'}
                            {view === 'TIER_2_COMPANY' && selectedCompany}
                            {view === 'TIER_3_PLAYERS' && 'Player Rankings'}
                        </h1>
                    </div>
                </div>

                {/* BREADCRUMBS / SUBTITLE */}
                <div style={{ display: 'flex', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem', alignItems: 'center' }}>
                     <span>Home</span>
                     {view !== 'TIER_1_HOME' && (
                         <>
                            <ChevronRight size={14} />
                            <span style={{ color: view === 'TIER_2_COMPANY' ? 'var(--accent)' : 'inherit' }}>{selectedCompany}</span>
                         </>
                     )}
                     {view === 'TIER_3_PLAYERS' && (
                          <>
                            <ChevronRight size={14} />
                            <span style={{ color: 'var(--accent)' }}>{selectedDetails?.product} ({selectedDetails?.gameType})</span>
                          </>
                     )}
                </div>
            </div>

            {/* FILTERS AREA (Only for Tier 2) */}
            {view === 'TIER_2_COMPANY' && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                         <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}><Filter size={16} /> Filter Products</h4>
                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                             {availableFilters.products.map(p => (
                                 <button
                                    key={p}
                                    onClick={() => toggleFilter('products', p)}
                                    className={`filter-chip ${activeFilters.products.includes(p) ? 'active' : ''}`}
                                 >
                                     {p}
                                 </button>
                             ))}
                             {availableFilters.products.length === 0 && <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No products found</span>}
                         </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                         <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}><Gamepad2 size={16} /> Filter Game Type</h4>
                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                             {availableFilters.gameTypes.map(t => (
                                 <button
                                    key={t}
                                    onClick={() => toggleFilter('gameTypes', t)}
                                    className={`filter-chip ${activeFilters.gameTypes.includes(t) ? 'active' : ''}`}
                                 >
                                     {t}
                                 </button>
                             ))}
                             {availableFilters.gameTypes.length === 0 && <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No games found</span>}
                         </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {renderTable()}
            </div>
        </div>
    );
}
