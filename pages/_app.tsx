import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';

// Context-Aware Backgrounds
const getBackgroundForRoute = (path: string) => {
  if (path.includes('/draw')) return '/bg-2.png'; // Art/Paint for Draw Game
  if (path.includes('/rebus')) return '/bg-1.png'; // Letters/Magnifying Glass for Word Game
  return '/bg-0.png'; // Default Toys for Lobby/Admin
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [bgImage, setBgImage] = useState('/bg-0.png');

  useEffect(() => {
    // Update background when route changes
    setBgImage(getBackgroundForRoute(router.pathname));
  }, [router.pathname]);

  return (
    <>
      <Head>
        <title>Virtual Games</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
      /* Global Background Wrapper */
      minHeight: '100vh',
      background: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.8)), url('${bgImage}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      color: 'white' // Default text color
    }}>
      <Component {...pageProps} />
    </div>
    </>
  );
}
