import { useState } from 'react';
import { isAppwriteConfigured } from '../lib/appwrite';
import { Database, AlertTriangle, CheckCircle, Copy, HelpCircle, X, Terminal, Server, ShieldCheck } from 'lucide-react';

export default function AppwriteBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const envSample = `# Appwrite Environment Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=rg_database
`;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className={`p-4 ${isAppwriteConfigured ? 'bg-emerald-950/40 border-emerald-800' : 'bg-blue-950/40 border-blue-800'} border-b flex flex-wrap items-center justify-between gap-4 text-xs font-medium`}>
        <div className="flex items-center gap-3">
          {isAppwriteConfigured ? (
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-full animate-pulse">
              <Server className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className={`${isAppwriteConfigured ? 'text-emerald-300' : 'text-blue-300'} font-semibold text-sm`}>
              {isAppwriteConfigured ? 'Appwrite Cloud-এর সাথে সফলভাবে সংযুক্ত!' : 'Appwrite ব্যাকএন্ড কনফিগারেশন হাব (Local Preview Mode)'}
            </p>
            <p className="text-slate-400 mt-0.5 text-xs">
              {isAppwriteConfigured 
                ? 'আপনার লাইভ Appwrite ক্লাউড ডাটাবেস ও রিয়েল-টাইম সার্ভিস সক্রিয় আছে।' 
                : 'বর্তমানে লোকাল স্টোরেজ ও ব্রডকাস্ট চ্যানেল ব্যবহার হচ্ছে। Appwrite ক্লাউড কানেক্টের জন্য গাইড দেখুন।'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isAppwriteConfigured 
              ? 'border-emerald-700 hover:bg-emerald-900 text-emerald-300' 
              : 'border-blue-700 hover:bg-blue-900 text-blue-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isAppwriteConfigured ? 'Appwrite সেটিংস দেখুন' : 'Appwrite ক্লাউড সেটআপ গাইড'}</span>
        </button>
      </div>

      {/* Modal Guide */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-pink-500" />
                <div>
                  <h3 className="text-lg font-bold text-white">Appwrite ক্লাউড ব্যাকএন্ড কনফিগারেশন নির্দেশিকা</h3>
                  <p className="text-xs text-slate-400 mt-1">rgomassenger এপ্লিকেশনে Appwrite ব্যাকএন্ড ও ডাটাবেস কানেক্ট করার উপায়</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-sm">
              {/* Step 1 */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-base">
                  <span className="bg-pink-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">১</span>
                  Appwrite প্রজেক্ট ও এনভায়রনমেন্ট ভেরিয়েবল সেটআপ
                </h4>
                <p className="text-slate-400 pl-7 leading-relaxed">
                  <a href="https://cloud.appwrite.io" target="_blank" rel="noreferrer" className="text-pink-400 hover:underline font-semibold">appwrite.io</a>-তে ফ্রি একাউন্ট খুলে একটি Project এবং Database (ID: <code className="text-pink-300">rg_database</code>) তৈরি করুন। এরপর নিচের এনভায়রনমেন্ট ভেরিয়েবল সেট করুন:
                </p>
                <div className="mt-2 ml-7 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between items-center pb-1 mb-1 border-b border-slate-800">
                    <span className="text-[11px] text-slate-400">.env / Environment Variables</span>
                    <button
                      onClick={() => copyToClipboard(envSample, 'env')}
                      className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedSection === 'env' ? 'কপি হয়েছে!' : 'কপি করুন'}
                    </button>
                  </div>
                  <p><span className="text-pink-400">NEXT_PUBLIC_APPWRITE_ENDPOINT</span>=https://cloud.appwrite.io/v1</p>
                  <p><span className="text-pink-400">NEXT_PUBLIC_APPWRITE_PROJECT_ID</span>=your_project_id</p>
                  <p><span className="text-pink-400">NEXT_PUBLIC_APPWRITE_DATABASE_ID</span>=rg_database</p>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-base">
                  <span className="bg-pink-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">২</span>
                  Appwrite Database Collections লিস্ট
                </h4>
                <p className="text-slate-400 pl-7 leading-relaxed mb-2">
                  আপনার <code className="text-pink-300">rg_database</code> ডাটাবেসের ভেতর নিচের ৭টি Collection তৈরি করুন:
                </p>
                <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">1. messages</span>
                    <span className="text-[11px] text-slate-400">Attributes: room, sender, content</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">2. billing</span>
                    <span className="text-[11px] text-slate-400">Attributes: member_name, amount, month, status, tx_id</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">3. events</span>
                    <span className="text-[11px] text-slate-400">Attributes: title, date, location, description</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">4. discussion</span>
                    <span className="text-[11px] text-slate-400">Attributes: title, author, content, category, likes</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">5. support</span>
                    <span className="text-[11px] text-slate-400">Attributes: title, name, description, category, status</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="font-bold text-white block">6. tasks</span>
                    <span className="text-[11px] text-slate-400">Attributes: title, description, category, due_date, priority, status</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Backup Notice */}
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-300 text-sm">সুপাবেস কনফিগারেশন ব্যাকআপ সংরক্ষিত!</h5>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    আপনার নির্দেশনামতে আগের সুপাবেস কোড ও SQL স্কিমা ফাইলের ব্যাকআপ তৈরি করে <code className="text-pink-300 font-mono">/lib/supabase.backup.js</code> এবং <code className="text-pink-300 font-mono">/components/SupabaseBanner.backup.js</code> এ সুরক্ষিত রাখা হয়েছে।
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 bg-slate-950/50 p-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-lg transition"
              >
                ঠিক আছে, বুঝতে পেরেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
