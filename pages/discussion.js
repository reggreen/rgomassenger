import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, ThumbsUp, Plus, Tag, Search, User, Filter, X, CornerDownRight, Sparkles, Edit3, Trash2, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['সব পোস্ট', 'ডিজাইন', 'প্রোগ্রামিং', 'সাধারণ আড্ডা', 'প্রশ্ন ও উত্তর'];

export default function Discussion() {
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('সব পোস্ট');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  // Form states
  const [authorName, setAuthorName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('সাধারণ আড্ডা');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load and subscribe
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('discussion')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;

    fetchPosts();

    const subscription = supabase
      .channel('public:discussion')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discussion' },
        () => {
          if (active) {
            fetchPosts();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenPostModal = () => {
    setEditingPostId(null);
    setTitle('');
    setAuthorName('');
    setContent('');
    setCategory('সাধারণ আড্ডা');
    setIsPostModalOpen(true);
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setAuthorName(post.author);
    setContent(post.content);
    setCategory(post.category);
    setIsPostModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPostModalOpen(false);
    setEditingPostId(null);
    setTitle('');
    setAuthorName('');
    setContent('');
    setCategory('সাধারণ আড্ডা');
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!authorName.trim() || !title.trim() || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const postData = {
      title: title.trim(),
      author: authorName.trim(),
      content: content.trim(),
      category: category,
    };

    try {
      if (editingPostId) {
        const { error } = await supabase
          .from('discussion')
          .update(postData)
          .eq('id', editingPostId);
        
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchPosts();
        }
      } else {
        const { error } = await supabase.from('discussion').insert({
          ...postData,
          likes: 0,
          replies: 0
        });
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchPosts();
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
        .from('discussion')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(error);
      } else {
        setPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleLikePost = async (id, currentLikes) => {
    try {
      // Optimistic state update
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: currentLikes + 1 } : p));
      
      const { error } = await supabase
        .from('discussion')
        .update({ likes: currentLikes + 1 })
        .eq('id', id);
      
      if (error) {
        console.error(error);
        // Rollback
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'সব পোস্ট' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="discussion-container">
      {/* Top Welcome Board */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-900/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            কমিউনিটি ফোরাম ও ওপেন ডিসকাশন
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">ফোরাম ও গ্রুপ ডিসকাশন</h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            আপনার নতুন কোনো আইডিয়া, প্রজেক্ট প্ল্যানিং বা কোনো প্রশ্ন থাকলে এখানে পোস্ট করুন। সবাই মতামত দিয়ে গ্রুপকে প্রাণবন্ত রাখুন।
          </p>
        </div>

        <button
          onClick={handleOpenPostModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/15 active:scale-95 transition-all duration-150 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন টপিক শুরু করুন</span>
        </button>
      </div>

      {/* Categories & Search Filter bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
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
            placeholder="পোস্টের বিষয় বা লেখক খুঁজুন..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Threads list */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <MessageCircle className="w-12 h-12 text-indigo-500/45" />
            <div>
              <p className="text-slate-300 font-bold">কোনো পোস্ট পাওয়া যায়নি</p>
              <p className="text-slate-500 text-xs mt-1">সবাইকে যুক্ত করতে একটি নতুন টপিক নিয়ে পোস্ট করুন!</p>
            </div>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-2xl p-6 transition duration-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start relative overflow-hidden">
              {/* Inline Deletion Confirmation Overlay */}
              {deletingPostId === post.id && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 text-center animate-in fade-in duration-150">
                  <AlertTriangle className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-white mb-1">আপনি কি নিশ্চিতভাবে এই পোস্টটি মুছে ফেলতে চান?</p>
                  <p className="text-xs text-slate-400 mb-4 px-4">"{post.title}" পোস্টটি চিরতরে মুছে যাবে।</p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleDeleteConfirm(post.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                      type="button"
                    >
                      হ্যাঁ, ডিলিট করুন
                    </button>
                    <button
                      onClick={() => setDeletingPostId(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                      type="button"
                    >
                      না, থাক
                    </button>
                  </div>
                </div>
              )}

              {/* Left Details */}
              <div className="space-y-3 flex-1 w-full">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-300">{post.author}</span>
                    </div>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-500 font-mono">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'আজ'}
                    </span>
                  </div>

                  {/* Card Controls */}
                  <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => handleStartEdit(post)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                      title="সম্পাদনা করুন"
                      type="button"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingPostId(post.id)}
                      className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="ডিলিট করুন"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-white leading-snug hover:text-indigo-400 transition cursor-pointer">
                    {post.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>

              {/* Right Interactions count */}
              <div className="flex md:flex-col items-center gap-2 justify-end flex-shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t border-slate-800 md:border-0">
                <button
                  onClick={() => handleLikePost(post.id, post.likes)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/40 border border-slate-850 hover:border-indigo-800/40 text-slate-400 hover:text-indigo-300 transition w-full md:w-28 justify-center text-xs font-bold"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{post.likes} লাইক</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New/Edit Topic Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-indigo-500">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {editingPostId ? 'আলোচনার বিষয় সম্পাদন করুন' : 'নতুন আলোচনার বিষয় পোস্ট করুন'}
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
            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">আপনার নাম</label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="উদা: ফয়সাল আহমেদ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">পোস্টের শিরোনাম (Title)</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="উদা: আমাদের প্রজেক্ট নিয়ে কিছু চমৎকার পরিকল্পনা"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">বিস্তারিত বিবরণ (Content)</label>
                <textarea
                  required
                  rows="4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="আপনার আলোচনার মূল অংশটি এখানে বিস্তারিত বর্ণনা করুন..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center text-sm"
              >
                {isSubmitting ? 'সেভ হচ্ছে...' : editingPostId ? 'পোস্ট আপডেট করুন' : 'ওপেন ফোরামে পোস্ট করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
