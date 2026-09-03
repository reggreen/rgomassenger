import { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import HeadlineTicker from '../components/HeadlineTicker';
import GlobalNotificationListener from '../components/GlobalNotificationListener';
import AuthGuard from '../components/AuthGuard';
import DashboardLayout from '../components/DashboardLayout';
import { setupServiceWorkerAlarmListener, registerBackgroundSync } from '../utils/alarmScheduler';
import { registerPushNotifications } from '../utils/pushManager';
import { appwrite as supabase } from '../lib/appwrite';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registerBackgroundSync();
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const myUser = localStorage.getItem('rg_username') || '';
            const myEmail = localStorage.getItem('rg_email') || '';
            const myRole = localStorage.getItem('rg_user_role') || '';
            if (myUser) {
              registerPushNotifications(myUser, myEmail, myRole).catch(() => {});
            }
          }
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    }

    // 2. Setup SW alarm messages listener
    const cleanupSWListener = setupServiceWorkerAlarmListener(
      (alarm) => {
        // Callback when an alarm is triggered from SW in background
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rg_task_alarm_received', { detail: alarm }));
        }
      },
      async (taskId) => {
        // Callback when user clicked "Complete Task" from notification action
        if (taskId) {
          try {
            await supabase.from('tasks').update({ status: 'Completed', alerted: true }).eq('id', taskId);
            window.dispatchEvent(new Event('rg_tasks_updated'));
          } catch (e) {
            console.error('Error completing task from notification action:', e);
          }
        }
      }
    );

    return () => {
      cleanupSWListener();
    };
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

