import { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import HeadlineTicker from '../components/HeadlineTicker';
import GlobalNotificationListener from '../components/GlobalNotificationListener';
import AuthGuard from '../components/AuthGuard';
import DashboardLayout from '../components/DashboardLayout';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, []);

  // Use custom page layout if defined, otherwise default to persistent DashboardLayout
  const getLayout = Component.getLayout !== undefined
    ? Component.getLayout
    : ((page) => <DashboardLayout>{page}</DashboardLayout>);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <HeadlineTicker />
        <GlobalNotificationListener />
        <main className="flex-1 flex flex-col">
          <AuthGuard>
            {getLayout(<Component {...pageProps} />)}
          </AuthGuard>
        </main>
      </div>
    </AuthProvider>
  );
}

export default MyApp;

