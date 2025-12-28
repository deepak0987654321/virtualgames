import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Box, Users, Coffee, Heart, Palette, Video, Brain, List, ShieldCheck, X, Check, Globe, Lock, BookOpen, Menu } from 'lucide-react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GAMES } from '../lib/gameConfig';
import GameCard from '../components/game/GameCard';
import RulesModal from '../components/game/RulesModal';

export default function LandingPage() {
  const router = useRouter();
  const GAMES_INFO = GAMES; // Use centralized config
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Modal & Mobile Menu State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    visibility: 'public',
    email: ''
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('data-id');
                if (id) setIsVisible(prev => ({ ...prev, [id]: true }));
            }
        });
      },
      { threshold: 0.1 }
    );

    // Initial observation
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
        observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (router.query.action === 'create') {
      setShowCreateModal(true);
      // Clean up the URL
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query.action]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
        const res = await fetch('/api/request-tenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            setFormSuccess(true);
            setTimeout(() => {
                setShowCreateModal(false);
                setFormSuccess(false);
                setFormData({ name: '', url: '', visibility: 'public', email: '' });
            }, 3000);
        }
    } catch (e) {
        console.error('Submit failed', e);
    } finally {
        setFormLoading(false);
    }
  };

  const setRef = (el: HTMLElement | null, id: string) => {
      if (el) {
          el.setAttribute('data-id', id);
          if (!sectionRefs.current.includes(el as any)) {
              (sectionRefs.current as any).push(el);
          }
      }
  };

  const updateUrlFromName = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-');
    setFormData(prev => ({ ...prev, name, url: slug }));
  };


  return (
    <div className="landing-wrapper" style={{ background: 'var(--bg-app)', color: 'white' }}>
      <Head>
        <title>Virtual Games | The Ultimate Social Gaming Platform</title>
        <meta name="description" content="Host private game spaces for your office team, friends, or family. Play Rebus, Draw & Guess, Charades, and more!" />
      </Head>

      {/* Navigation Bar */}
      <nav className="nav-bar">
          <div className="nav-container">
              <div className="logo">
                  <Box size={32} color="var(--accent)" />
                  <span>VirtualGames</span>
              </div>

              {/* Desktop Nav */}
              <div className="nav-links">
                  <a href="#games">Games</a>
                  <a href="#features">Solutions</a>
                  <button className="btn-primary" onClick={() => router.push('/superadmin')} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                      Superadmin
                  </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                  <Menu size={28} color="white" />
              </button>
          </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
                  <div className="mobile-menu-header">
                      <div className="logo">
                          <Box size={28} color="var(--accent)" />
                          <span>VirtualGames</span>
                      </div>
                      <button className="close-btn-mobile" onClick={() => setMobileMenuOpen(false)}>
                          <X size={28} />
                      </button>
                  </div>
                  <div className="mobile-links">
                      <a href="#games" onClick={() => setMobileMenuOpen(false)}>Games</a>
                      <a href="#features" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
                      <a onClick={() => { router.push('/superadmin'); setMobileMenuOpen(false); }}>Superadmin</a>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', width: '100%', margin: '10px 0' }} />
                      <button className="btn-primary" onClick={() => { router.push('/demo'); setMobileMenuOpen(false); }}>
                          Try Demo
                      </button>
                      <button className="btn-ghost" onClick={() => { setShowCreateModal(true); setMobileMenuOpen(false); }}>
                          Create Room
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Hero Section */}
      <div className="landing-container">
          <section className="hero-section">
              <div className="hero-content">
                  <span className="hero-tagline">Level up your connection</span>
                  <h1 className="hero-title">
                      The Fun way to <span>Connect</span> virtually.
                  </h1>
                  <p className="hero-desc">
                      Whether it's a corporate team building, a friends' hangout, or a family reunion,
                      VirtualGames brings you together with delightful multiplayer experiences.
                  </p>

                  <div className="glass-panel" style={{ padding: '35px', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 style={{ marginBottom: '22px', textAlign: 'left', fontSize: '1.3rem', fontWeight: 700 }}>Ready to start your party?</h3>
                      <div className="hero-buttons">
                          <button className="btn-primary" onClick={() => router.push('/demo')} style={{
                              flex: 1.5,
                              padding: '18px 30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem',
                              boxShadow: '0 10px 20px -5px rgba(219, 253, 96, 0.3)'
                          }}>
                              Try Demo <ArrowRight size={20} style={{ marginLeft: '12px' }} />
                          </button>
                          <button className="btn-ghost" onClick={() => setShowCreateModal(true)} style={{
                              flex: 1,
                              padding: '18px 30px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '16px',
                              color: 'white',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '1rem'
                          }}>
                              Create Room
                          </button>
                      </div>
                  </div>
              </div>

              <div className="hero-visual">
                  <img
                    src="/images/hero_new.png"
                    alt="Social Gaming Reimagined"
                    className="hero-main-img"
                    style={{ width: '100%', maxWidth: '750px' }}
                  />
              </div>
          </section>

          {/* Features / Use Cases */}
          <section id="features" ref={el => setRef(el, 'features')} className={`reveal-on-scroll ${isVisible['features'] ? 'visible' : ''}`}>
              <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                  <h2 style={{ fontSize: '3rem', marginBottom: '15px' }}>Perfect for every occasion</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Tailored experiences for how you want to play.</p>
              </div>

              <div className="feature-grid">
                  <div className="feature-card">
                      <i><Users size={32} /></i>
                      <h3>Office Teams</h3>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Boost morale and break the ice with dedicated private workspaces for your company.</p>
                      <img src="/images/office_team_gaming.png" alt="Office Gaming" style={{ width: '100%', borderRadius: '15px', marginTop: '20px', opacity: 0.8 }} />
                  </div>
                  <div className="feature-card">
                      <i><Coffee size={32} /></i>
                      <h3>Friends Groups</h3>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Host game nights easily. Send a link, jump in, and start playing in seconds.</p>
                      <img src="/images/family_friends_gaming.png" alt="Friends Gaming" style={{ width: '100%', borderRadius: '15px', marginTop: '20px', opacity: 0.8 }} />
                  </div>
                  <div className="feature-card">
                      <i><Heart size={32} /></i>
                      <h3>Family Gatherings</h3>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Simple enough for grandparents, fun enough for kids. Stay connected across distance.</p>
                      <img src="/images/family_gathering.png" alt="Family Gaming" style={{ width: '100%', borderRadius: '15px', marginTop: '20px', opacity: 0.8 }} />
                  </div>
              </div>
          </section>

          {/* Games Section */}
          <section id="games" ref={el => setRef(el, 'games')} className={`reveal-on-scroll ${isVisible['games'] ? 'visible' : ''}`} style={{ textAlign: 'center' }}>
              <div className="library-header" style={{ marginBottom: '60px' }}>
                  <div className="tag">THE COLLECTIONS</div>
                  <h2 style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-2px' }}>Our Game <span>Library</span></h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '700px', margin: '20px auto 0' }}>Explore our hand-picked social experiences designed to foster connection and creativity.</p>
              </div>

              <div className="game-grid-layout">
                  {GAMES_INFO.slice(0, 3).map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                        isAdmin={false}
                        layoutType="landing"
                        onPlay={() => router.push('/demo')}
                        onViewRules={(e) => { e.stopPropagation(); setSelectedGame(game); }}
                      />
                  ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <button
                      className="btn-secondary"
                      onClick={() => router.push('/library')}
                      style={{
                          padding: '18px 40px',
                          fontSize: '1.1rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                      View All Games <ArrowRight size={22} />
                  </button>
              </div>
          </section>

          {/* CTA Banner */}
          <section ref={el => setRef(el, 'cta')} className={`cta-banner reveal-on-scroll ${isVisible['cta'] ? 'visible' : ''}`}>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '25px', letterSpacing: '-2px' }}>Ready to play?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>Start your private game universe in just one click. Perfect for teams, families, and friends.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                  <button className="btn-primary" onClick={() => router.push('/demo')} style={{ padding: '20px 50px', fontSize: '1.2rem' }}>
                      Try Interactive Demo <ArrowRight size={22} style={{ marginLeft: '12px' }} />
                  </button>
                  <button className="btn-ghost" onClick={() => setShowCreateModal(true)} style={{
                      padding: '20px 50px',
                      fontSize: '1.2rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      color: 'white'
                  }}>
                      Create Workspace
                  </button>
              </div>
          </section>

          {/* Footer */}
          <footer style={{ padding: '60px 0', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px', flexWrap: 'wrap' }}>
                  <div className="logo" style={{ fontSize: '1.2rem' }}>
                      <Box size={24} color="var(--accent)" />
                      <span>VirtualGames</span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <ShieldCheck size={18} color="var(--primary)" />
                      <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Secured Private Spaces</span>
                  </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  &copy; {new Date().getFullYear()} Virtual Games Platform. All rights reserved.
                  <span onClick={() => router.push('/superadmin')} style={{ cursor: 'pointer', marginLeft: '10px', textDecoration: 'underline' }}>Superadmin Portal</span>
              </p>
          </footer>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
          <div className="modal-overlay">
              <div className="modal-card glass-panel" style={{ background: 'var(--bg-card)' }}>
                  <button className="close-btn" onClick={() => setShowCreateModal(false)}><X size={24} /></button>

                  {formSuccess ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                          <div className="success-icon"><Check size={40} /></div>
                          <h2 style={{ marginBottom: '15px' }}>Request Sent!</h2>
                          <p style={{ color: 'var(--text-secondary)' }}>We've received your request for <strong>{formData.name}</strong>. We will get back to you shortly at {formData.email}.</p>
                      </div>
                  ) : (
                      <>
                        <h2 style={{ marginBottom: '10px' }}>Create Your Game Space</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.95rem' }}>Fill in the details to request your custom workspace.</p>

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label>Workspace Name</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Acme Corp Fun"
                                    required
                                    value={formData.name}
                                    onChange={e => updateUrlFromName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Custom URL</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>virtualgames.io/</span>
                                    <input
                                        className="input-field"
                                        style={{ paddingLeft: '115px' }}
                                        placeholder="your-slug"
                                        required
                                        value={formData.url}
                                        onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Visibility</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.visibility === 'public' ? 'active' : ''}`}
                                        onClick={() => setFormData(prev => ({...prev, visibility: 'public'}))}
                                    >
                                        <Globe size={16} /> Public
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.visibility === 'private' ? 'active' : ''}`}
                                        onClick={() => setFormData(prev => ({...prev, visibility: 'private'}))}
                                    >
                                        <Lock size={16} /> Private
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Your Work Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="you@company.com"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={formLoading}>
                                {formLoading ? 'Submitting...' : 'Send Request'}
                            </button>
                        </form>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Game Rules Modal */}
      <RulesModal
        game={selectedGame}
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        isAdmin={true}
        userRole="Visitor"
        onPlay={() => {
            setSelectedGame(null);
            router.push('/demo');
        }}
      />

      <style jsx>{`
        .landing-wrapper {
            overflow-x: hidden;
            scroll-behavior: smooth;
        }
        .btn-secondary:hover {
            background: rgba(255,255,255,0.05) !important;
            border-color: var(--accent) !important;
        }
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(8px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        .modal-card {
            width: 100%;
            max-width: 500px;
            padding: 40px;
            border-radius: 30px;
            position: relative;
            animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .close-btn {
            position: absolute;
            top: 25px;
            right: 25px;
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            transition: color 0.2s;
        }
        .close-btn:hover { color: white; }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .form-group label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-secondary);
        }
        .toggle-btn {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .toggle-btn.active {
            background: var(--accent);
            color: black;
            border-color: var(--accent);
        }
        .success-icon {
            width: 80px;
            height: 80px;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
