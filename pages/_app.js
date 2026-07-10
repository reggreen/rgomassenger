import Navbar from '../components/Navbar';
import HeadlineTicker from '../components/HeadlineTicker';
import GlobalNotificationListener from '../components/GlobalNotificationListener';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <HeadlineTicker />
      <GlobalNotificationListener />
      <main className="flex-1 flex flex-col">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

export default MyApp;
