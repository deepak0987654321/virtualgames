import { useState, useEffect } from 'react';
import { GAMES } from '../lib/gameConfig';
import { ArrowLeft, Box, ArrowRight, Gamepad2, Check, BookOpen } from 'lucide-react';
import GameCard from '../components/game/GameCard';
import RulesModal from '../components/game/RulesModal';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LibraryPage() {
  const router = useRouter();
  const GAMES_DATA = GAMES;
  const [scrolled, setScrolled] = useState(false);
  const [viewingRules, setViewingRules] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="library-root">
      <Head>
        <title>Game Library | VirtualGames Showcase</title>
        <meta name="description" content="Explore our collection of social games. View rules, features, and how to play our social experiences." />
      </Head>

      {/* Navigation */}
      <nav className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
          <div className="nav-container" style={{ maxWidth: '1400px' }}>
              <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Box size={28} color="var(--accent)" />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-1.5px' }}>VirtualGames</span>
              </div>
              <button
                  className="btn-ghost"
                  onClick={() => router.push('/')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}
              >
                  <ArrowLeft size={18} /> Back to Home
              </button>
          </div>
      </nav>

      <main className="library-container">
          {/* Header Section */}
          <header className="library-header">
              <div className="glass-panel header-banner">
                  <div className="tag">THE COLLECTIONS</div>
                  <h1>Our Game <span>Library</span></h1>
                  <p>Explore our premium suite of social multiplayer experiences designed for team bonding and creative play.</p>
              </div>
          </header>

          {/* Games List (3 in Column) */}
          <section style={{ marginTop: '0' }}>
                <div className="game-grid-layout">
                   {GAMES_DATA.map((game, idx) => (
                       <GameCard
                           key={idx}
                           game={game}
                           isAdmin={false}
                           layoutType="landing"
                           onPlay={() => router.push('/demo')}
                           onViewRules={(e) => { e.stopPropagation(); setViewingRules(game); }}
                       />
                   ))}
                </div>
          </section>

          {/* CTA Section */}
          <section className="library-cta">
              <div className="glass-panel cta-box">
                  <Gamepad2 size={48} color="var(--accent)" style={{ marginBottom: '20px' }} />
                  <h2>Want to start a game?</h2>
                  <p>Create your private workspace in seconds and invite your team or friends.</p>
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '40px' }}>
                      <button className="btn-primary" onClick={() => router.push('/?action=create')} style={{ padding: '18px 45px', fontSize: '1.1rem' }}>
                          Get Started for Free <ArrowRight size={22} style={{ marginLeft: '12px' }} />
                      </button>
                      <button className="btn-ghost" onClick={() => router.push('/demo')} style={{
                        padding: '18px 45px',
                        fontSize: '1.1rem',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.05)'
                      }}>
                          Try Interactive Demo
                      </button>
                  </div>
              </div>
          </section>
      </main>

      <RulesModal
        game={viewingRules}
        isOpen={!!viewingRules}
        onClose={() => setViewingRules(null)}
        isAdmin={true}
        userRole="Explorer"
        onPlay={() => {
            setViewingRules(null);
            router.push('/?action=create');
        }}
      />

      <footer className="library-footer">
          <div className="footer-content">
              <div className="logo" style={{ opacity: 0.5 }}>
                  <Box size={24} color="var(--accent)" />
                  <span>VirtualGames Showcase</span>
              </div>
              <p>&copy; {new Date().getFullYear()} Virtual Games Platform. All rights reserved.</p>
          </div>
      </footer>

      <style jsx>{`
        .library-root {
            background-color: var(--bg-app);
            color: var(--text-primary);
            min-height: 100vh;
            font-family: var(--font-main);
        }

        .nav-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            transition: all 0.3s;
        }
        .nav-bar.scrolled {
            background: rgba(15, 17, 26, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-subtle);
        }

        .library-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 120px 40px 80px;
        }

        .library-header {
            text-align: center;
            margin-bottom: 80px;
        }

        .header-banner {
            padding: 60px 40px;
            border-radius: 40px;
            position: relative;
            overflow: hidden;
        }

        .tag {
            display: inline-block;
            padding: 6px 16px;
            background: rgba(219, 253, 96, 0.1);
            color: var(--accent);
            border-radius: 30px;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 20px;
        }

        h1 {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 span {
            color: var(--accent);
        }

        .library-header p {
            font-size: 1.25rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto 30px;
            line-height: 1.6;
        }

        .info-banner {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .games-showcase {
            display: flex;
            flex-direction: column;
            gap: 60px;
        }

        .game-showcase-card {
            display: grid;
            grid-template-columns: 350px 1fr;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-subtle);
            border-radius: 32px;
            overflow: hidden;
            transition: transform 0.4s ease, border-color 0.4s ease;
        }

        .game-showcase-card:hover {
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
        }

        .card-visual {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }

        .glow-effect {
            position: absolute;
            width: 150px;
            height: 150px;
            filter: blur(80px);
            opacity: 0.2;
            z-index: 0;
        }

        .card-content {
            padding: 50px;
        }

        .card-header {
            margin-bottom: 20px;
        }

        .game-tag {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 4px 12px;
            border-radius: 50px;
            margin-bottom: 10px;
            display: inline-block;
        }

        .card-header h2 {
            font-size: 2.5rem;
            margin: 10px 0;
        }

        .game-desc {
            font-size: 1.1rem;
            color: var(--text-primary);
            font-weight: 500;
            margin-bottom: 30px;
            opacity: 0.9;
        }

        .rules-section {
            margin-bottom: 30px;
            padding-left: 20px;
            border-left: 2px solid var(--border-subtle);
        }

        .rules-section h3 {
            font-size: 0.9rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .rules-section p {
            line-height: 1.7;
            color: var(--text-secondary);
        }

        .features-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .feature-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            color: var(--text-primary);
        }

        .library-cta {
            margin-top: 100px;
            text-align: center;
        }

        .cta-box {
            padding: 80px 40px;
            border-radius: 40px;
            background: linear-gradient(135deg, rgba(219, 253, 96, 0.05) 0%, transparent 100%);
        }

        .cta-box h2 {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }

        .cta-box p {
            color: var(--text-secondary);
            font-size: 1.2rem;
        }

        .library-footer {
            padding: 60px 0;
            border-top: 1px solid var(--border-subtle);
            text-align: center;
            margin-top: 100px;
        }

        .footer-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }

        .footer-content p {
            color: var(--text-secondary);
            font-size: 0.85rem;
        }

        @media (max-width: 900px) {
            h1 { font-size: 3rem; }
            .features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
