import { useState, useEffect } from 'react';
import { appwrite as supabase } from '../lib/appwrite';
import { HelpCircle, AlertTriangle, CheckCircle, Plus, Search, User, Tag, Clock, X, Edit3, Trash2 } from 'lucide-react';
import AppwriteBanner from '../components/AppwriteBanner';

const CATEGORIES = ['সব টিকিট', 'বিলিং ও পেমেন্ট', 'সার্ভার সমস্যা', 'ডিজাইন ও বাগ', 'অন্যান্য'];

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('সব টিকিট');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [deletingTicketId, setDeletingTicketId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('সার্ভার সমস্যা');
  const [status, setStatus] = useState('Open');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load and subscribe
  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setTickets(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;

    fetchTickets();

    const subscription = supabase
      .channel('public:support')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support' },
        () => {
          if (active) {
            fetchTickets();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenTicketModal = () => {
    setEditingTicketId(null);
    setName('');
    setTitle('');
    setDescription('');
    setCategory('সার্ভার সমস্যা');
    setStatus('Open');
    setIsTicketModalOpen(true);
  };

  const handleStartEdit = (ticket) => {
    setEditingTicketId(ticket.id);
    setName(ticket.name);
    setTitle(ticket.title);
    setDescription(ticket.description);
    setCategory(ticket.category);
    setStatus(ticket.status || 'Open');
    setIsTicketModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTicketModalOpen(false);
    setEditingTicketId(null);
    setName('');
    setTitle('');
    setDescription('');
    setCategory('সার্ভার সমস্যা');
    setStatus('Open');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const ticketData = {
      title: title.trim(),
      name: name.trim(),
      description: description.trim(),
      category: category,
      status: status
    };

    try {
      if (editingTicketId) {
        const { error } = await supabase
          .from('support')
          .update(ticketData)
          .eq('id', editingTicketId);
        
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchTickets();
        }
      } else {
        const { error } = await supabase.from('support').insert(ticketData);
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchTickets();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      const { error } = await supabase
        .from('support')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(error);
      } else {
        setTickets(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Open' ? 'Resolved' : 'Open';
    try {
      // Optimistic update
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
      
      const { error } = await supabase
        .from('support')
        .update({ status: nextStatus })
        .eq('id', id);
      
      if (error) {
        console.error(error);
        fetchTickets(); // Rollback
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesCategory = selectedCategory === 'সব টিকিট' || ticket.category === selectedCategory;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="support-container">
      {/* Appwrite Connection Status Banner */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
        <AppwriteBanner />
      </div>

      {/* Top Welcome Board */}
      <div className="bg-gradient-to-r from-teal-900/40 to-slate-900 border border-teal-900/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-400">
            <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
            হেল্পডেস্ক ও বাগ ট্র্যাকিং সিস্টেম
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">টেকনিক্যাল সাপোর্ট ও হেল্পডেস্ক</h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            আপনার কোনো সার্ভিস বাগ, বিলিং সমস্যা বা সাধারণ জিজ্ঞাসা থাকলে নিচে টিকিট পোস্ট করুন। ডেভেলপার প্যানেল সমাধান দিয়ে সাহায্য করবে।
          </p>
        </div>

        <button
          onClick={handleOpenTicketModal}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-teal-500/15 active:scale-95 transition-all duration-150 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন টিকিট ফাইল করুন</span>
        </button>
      </div>

      {/* Categories & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/15'
                  : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 flex-shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="টিকিটের বিষয় বা নাম খুঁজুন..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <HelpCircle className="w-12 h-12 text-teal-500/45" />
            <div>
              <p className="text-slate-300 font-bold">কোনো সাপোর্ট টিকিট পাওয়া যায়নি</p>
              <p className="text-slate-500 text-xs mt-1">সবকিছু ঠিকঠাক কাজ করছে! কোনো বাগ থাকলে টিকিট ফাইল করতে পারেন।</p>
            </div>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-2xl p-6 transition duration-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start relative overflow-hidden group">
              {/* Inline Deletion Confirmation Overlay */}
              {deletingTicketId === ticket.id && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 text-center animate-in fade-in duration-150">
                  <AlertTriangle className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-white mb-1">আপনি কি নিশ্চিতভাবে এই টিকিটটি মুছে ফেলতে চান?</p>
                  <p className="text-xs text-slate-400 mb-4 px-4">"{ticket.title}" টিকিটটি চিরতরে মুছে যাবে।</p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleDeleteConfirm(ticket.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                      type="button"
                    >
                      হ্যাঁ, ডিলিট করুন
                    </button>
                    <button
                      onClick={() => setDeletingTicketId(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                      type="button"
                    >
                      না, থাক
                    </button>
                  </div>
                </div>
              )}

              {/* Left Side Details */}
              <div className="space-y-3 flex-1 w-full">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                      {ticket.category}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-300">{ticket.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'আজ'}
                    </span>
                  </div>

                  {/* Card Controls */}
                  <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => handleStartEdit(ticket)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                      title="সম্পাদনা করুন"
                      type="button"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingTicketId(ticket.id)}
                      className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="ডিলিট করুন"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-white leading-snug">
                    {ticket.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>

              {/* Right Side Status & Resolving controls */}
              <div className="flex md:flex-col items-center gap-2 justify-end flex-shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t border-slate-800 md:border-0">
                {/* Status Pills */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold w-full md:w-32 justify-center border ${
                  ticket.status === 'Open'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {ticket.status === 'Open' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ওপেন টিকিট</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>মীমাংসিত (Solved)</span>
                    </>
                  )}
                </span>

                {/* Resolve/Reopen button */}
                <button
                  onClick={() => handleToggleStatus(ticket.id, ticket.status)}
                  className="w-full md:w-32 bg-slate-950 hover:bg-teal-950/40 border border-slate-850 hover:border-teal-800/40 text-xs font-bold py-2.5 rounded-xl text-slate-400 hover:text-teal-300 transition text-center"
                >
                  {ticket.status === 'Open' ? 'সমাধান করুন ✓' : 'পুনরায় খুলুন ↺'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-teal-500">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {editingTicketId ? 'টিকিট সম্পাদন করুন' : 'নতুন সাপোর্ট টিকিট খুলুন'}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">আপনার নাম</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="উদা: কামরুল ইসলাম"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">সমস্যার ধরণ (Category)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">টিকিটের বিষয় (Subject / Title)</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="উদা: সাইট লোড হতে বেশি সময় লাগছে"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">টিকিট স্ট্যাটাস (Status)</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Open">Open (ওপেন টিকিট)</option>
                    <option value="Resolved">Resolved (মীমাংসিত)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">সমস্যার বিস্তারিত বর্ণনা</label>
                <textarea
                  required
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="আপনার সমস্যার সম্মুখীন হওয়া ঘটনাটি বিস্তারিত বর্ণনা করুন..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center text-sm"
              >
                {isSubmitting ? 'সেভ হচ্ছে...' : editingTicketId ? 'টিকিট আপডেট করুন' : 'টিকিট পোস্ট করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
