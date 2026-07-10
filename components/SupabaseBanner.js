import { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { Database, AlertTriangle, CheckCircle, Copy, HelpCircle, X, Terminal } from 'lucide-react';

export default function SupabaseBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const sqlSchema = `-- আগের পুরানো টেবিলগুলো থাকলে তা মুছে ফেলার জন্য (কোনো কনফ্লিক্ট এড়াতে)
drop table if exists messages cascade;
drop table if exists billing cascade;
drop table if exists events cascade;
drop table if exists discussion cascade;
drop table if exists support cascade;
drop table if exists tasks cascade;

-- ১. messages টেবিল (চ্যাট রুমের জন্য)
create table messages (
  id uuid default gen_random_uuid() primary key,
  room text not null,
  sender text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ২. billing টেবিল (বিলিং ও ফান্ড ট্র্যাকিংয়ের জন্য)
create table billing (
  id uuid default gen_random_uuid() primary key,
  member_name text not null,
  amount numeric not null,
  month text not null,
  status text not null, -- 'Paid' অথবা 'Unpaid'
  payment_date date,
  tx_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ৩. events টেবিল (ইভেন্টস ট্র্যাকিংয়ের জন্য)
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date timestamp with time zone not null,
  location text not null,
  description text,
  priority text default 'মাঝারি',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ৪. discussion টেবিল (ফোরাম ও আলোচনার জন্য)
create table discussion (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  content text not null,
  category text not null,
  likes integer default 0,
  replies integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ৫. support টেবিল (হেল্পডেস্ক টিকিটের জন্য)
create table support (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  name text not null,
  description text not null,
  category text not null,
  status text default 'Open' not null, -- 'Open' অথবা 'Resolved'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ৬. tasks টেবিল (টাস্ক ও রিমাইন্ডারের জন্য)
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text,
  due_date timestamp with time zone not null,
  email text,
  channels text default 'Both',
  priority text default 'মাঝারি',
  status text default 'Pending',
  alerted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- সুপাবেস রিয়েল-টাইম সক্রিয় করার জন্য নিচের কাজগুলো করুন:
-- Supabase Dashboard > Database > Replication > 'supabase_realtime' পাবলিকেশন এডিট করে
-- messages, billing, events, discussion, support, tasks টেবিলগুলো যুক্ত করুন।
`;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className={`p-4 ${isSupabaseConfigured ? 'bg-emerald-950/40 border-emerald-800' : 'bg-amber-950/40 border-amber-800'} border-b flex flex-wrap items-center justify-between gap-4 text-xs font-medium`}>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured ? (
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-full animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className={`${isSupabaseConfigured ? 'text-emerald-300' : 'text-amber-300'} font-semibold text-sm`}>
              {isSupabaseConfigured ? 'Supabase এর সাথে সফলভাবে সংযুক্ত!' : 'সুপাবেস কানেকশন গাইড (Local Sandbox Mode)'}
            </p>
            <p className="text-slate-400 mt-0.5 text-xs">
              {isSupabaseConfigured 
                ? 'আপনার লাইভ সুপাবেস ডাটাবেস ও রিয়েল-টাইম সার্ভিস সক্রিয় আছে।' 
                : 'বর্তমানে লোকাল স্টোরেজ ব্যবহার হচ্ছে। লাইভ চ্যাটের জন্য সুপাবেস কনফিগার করুন।'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSupabaseConfigured 
              ? 'border-emerald-700 hover:bg-emerald-900 text-emerald-300' 
              : 'border-amber-700 hover:bg-amber-900 text-amber-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isSupabaseConfigured ? 'ডাটাবেস সেটিংস দেখুন' : 'কিভাবে লাইভ করবেন? (গাইড)'}</span>
        </button>
      </div>

      {/* Modal Guide */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-bold text-white">সুপাবেস (Supabase) কনফিগারেশন নির্দেশিকা</h3>
                  <p className="text-xs text-slate-400 mt-1">rgomassenger এপ্লিকেশনকে লাইভ ও রিয়েল-টাইম চ্যাটিং করার গাইড</p>
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
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">১</span>
                  এনভায়রনমেন্ট ভেরিয়েবল সেটআপ করুন
                </h4>
                <p className="text-slate-400 pl-7 leading-relaxed">
                  আমাদের AI Studio বা আপনার লাইভ প্ল্যাটফর্মে নিচের দুটি এনভায়রনমেন্ট ভেরিয়েবল যুক্ত করুন:
                </p>
                <div className="mt-2 ml-7 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-1 text-slate-300">
                  <p><span className="text-pink-400">NEXT_PUBLIC_SUPABASE_URL</span>=your_supabase_project_url</p>
                  <p><span className="text-pink-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=your_supabase_anon_key</p>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-base">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">২</span>
                  SQL কুয়েরি রান করুন (Supabase SQL Editor-এ)
                </h4>
                <p className="text-slate-400 pl-7 leading-relaxed mb-2">
                  আপনার সুপাবেস ড্যাশবোর্ডে গিয়ে <strong>SQL Editor</strong>-এ নতুন একটি কুয়েরি ট্যাব খুলুন এবং নিচের কোডটি কপি করে পেস্ট করে <strong>Run</strong> বাটনে ক্লিক করুন। এটি প্রয়োজনীয় সব টেবিল তৈরি করে দেবে:
                </p>
                <div className="ml-7 relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center bg-slate-800/50 px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      schema.sql
                    </span>
                    <button
                      onClick={() => copyToClipboard(sqlSchema, 'sql')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedSection === 'sql' ? 'কপি হয়েছে!' : 'কোড কপি করুন'}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono max-h-60 text-emerald-400">
                    {sqlSchema}
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-base">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">৩</span>
                  রিয়েল-টাইম (Realtime) ব্রডকাস্ট চালু করুন
                </h4>
                <p className="text-slate-400 pl-7 leading-relaxed">
                  ম্যাসেঞ্জার এর মতো লাইভ চ্যাটিং উপভোগ করার জন্য Supabase এ রিয়েল-টাইম লিসেনিং সক্রিয় করতে হবে:
                </p>
                <ol className="list-decimal pl-14 mt-2 space-y-1.5 text-slate-300">
                  <li>আপনার সুপাবেস ড্যাশবোর্ড থেকে বাম পাশের মেনুতে <strong>Database</strong>-এ যান।</li>
                  <li><strong>Replication</strong> অপশনে ক্লিক করুন।</li>
                  <li><strong>supabase_realtime</strong> পাবলিকেশনটির পাশে <strong>Edit tables</strong> এ ক্লিক করুন।</li>
                  <li>আমাদের তৈরি করা টেবিলগুলো (বিশেষ করে <code className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-xs">messages</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-xs">billing</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-xs">events</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-xs">discussion</code> এবং <code className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-400 font-mono text-xs">support</code>) টিক মার্ক দিয়ে যুক্ত করে সংরক্ষণ করুন।</li>
                </ol>
              </div>

              {/* Step 4 */}
              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 flex gap-3">
                <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-blue-300 text-sm">লোকাল স্যান্ডবক্স মোড কি?</h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    আপনার সুবিধার্থে আমরা একটি রিয়েল-টাইম স্যান্ডবক্স সিমুলেটর তৈরি করেছি। সুপাবেস কানেক্ট না করলেও আপনি সম্পূর্ণ অ্যাপটি একাধিক ব্রাউজার ট্যাব খুলে মেসেঞ্জার এর মতো লাইভ মেসেজ আদান-প্রদান করতে পারবেন এবং বিলিং, হেল্পডেস্কের সকল কাজ সম্পন্ন করতে পারবেন।
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 bg-slate-950/50 p-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-lg shadow-blue-600/10 transition"
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
