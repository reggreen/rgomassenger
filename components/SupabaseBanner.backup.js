// =========================================================================
// BACKUP FILE: SUPABASE BANNER & SQL GUIDE
// (স্বয়ংক্রিয় ব্যাকআপ: এই ফাইলটি ব্যাকআপ হিসেবে গচ্ছিত আছে।)
// =========================================================================

import { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase.backup';
import { Database, AlertTriangle, CheckCircle, Copy, HelpCircle, X, Terminal } from 'lucide-react';

export default function SupabaseBannerBackup() {
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
`;

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
      <p className="font-bold text-amber-400">সুপাবেস কনফিগারেশন ব্যাকআপ ফাইল</p>
      <p className="text-[11px] mt-1">এটি ব্যাকআপ হিসেবে সংরক্ষণ করা হয়েছে।</p>
    </div>
  );
}
