import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DemoRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Automatically redirect to the standard demo space
        // We can add a 'demo' flag to maybe show some help overlays later
        router.replace('/ds-family?demo=true');
    }, [router]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0b10',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" />
                <p style={{ marginTop: '20px', fontSize: '1.1rem', opacity: 0.8 }}>Preparing your demo experience...</p>
            </div>
            <style jsx>{`
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: var(--accent, #22d3ee);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
