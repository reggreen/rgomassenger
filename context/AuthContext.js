import { createContext, useContext, useState, useEffect } from 'react';
import { account, ID, isAppwriteConfigured } from '../lib/appwrite';

const AuthContext = createContext();

export const DEFAULT_ADMIN_ACCOUNT = {
  id: 'usr_admin_01',
  name: 'MD SHANTO',
  email: 'redgreenonline2023@gmail.com',
  role: 'অ্যাডমিন / কমিউনিটি প্রধান',
  avatar_emoji: '🧑‍💻',
  phone: '+880 1700-000000',
  bio: 'rgomassenger কমিউনিটির প্রধান সিস্টেম অ্যাডমিন।'
};

export const DEMO_ACCOUNTS = [DEFAULT_ADMIN_ACCOUNT];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appLogo, setAppLogo] = useState(null);

  // Initialize auth state and app logo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('rg_app_logo');
      if (savedLogo) {
        setAppLogo(savedLogo);
      }
    }
    checkUser();
  }, []);

  const updateAppLogo = (newLogo) => {
    setAppLogo(newLogo);
    if (typeof window !== 'undefined') {
      if (newLogo) {
        localStorage.setItem('rg_app_logo', newLogo);
      } else {
        localStorage.removeItem('rg_app_logo');
      }
    }
  };

  const resetAppLogo = () => {
    setAppLogo(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rg_app_logo');
    }
  };

  // Sync user profile to storage and Supabase profiles table
  const saveRegisteredUser = async (userObj) => {
    if (!userObj || !userObj.email) return;
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        let users = stored ? JSON.parse(stored) : [DEFAULT_ADMIN_ACCOUNT];
        const existingIdx = users.findIndex(u => u.email.toLowerCase() === userObj.email.toLowerCase());
        if (existingIdx >= 0) {
          users[existingIdx] = { ...users[existingIdx], ...userObj };
        } else {
          users.push(userObj);
        }
        localStorage.setItem('rg_all_users', JSON.stringify(users));
      }

      // Sync to Supabase profiles
      const { supabase } = await import('../lib/supabase');
      await supabase.from('profiles').insert([{
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role || 'সদস্য',
        avatar_emoji: userObj.avatar_emoji || '🧑‍💻'
      }]);
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }
  };

  const checkUser = async () => {
    setLoading(true);
    try {
      // 1. Try Appwrite Account SDK if configured
      if (isAppwriteConfigured) {
        try {
          const appwriteUser = await account.get();
          if (appwriteUser) {
            const mappedUser = {
              id: appwriteUser.$id,
              name: appwriteUser.name || 'ইউজার',
              email: appwriteUser.email,
              role: 'ভেরিফাইড ইউজার',
              avatar_emoji: '🧑‍💻',
              loggedIn: true
            };
            setUser(mappedUser);
            localStorage.setItem('rg_current_user', JSON.stringify(mappedUser));
            localStorage.setItem('rg_username', mappedUser.name);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Appwrite session not active or offline:', e);
        }
      }

      // 2. Check LocalStorage fallback
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('rg_current_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser({ ...parsed, loggedIn: true });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Invalid local user data:', e);
          }
        }
      }

      // 3. Unauthenticated default (User must log in via Login Modal / Login Page)
      setUser(null);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login Handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      // 1. Try Appwrite Authentication
      if (isAppwriteConfigured) {
        try {
          // Delete old session if any
          try { await account.deleteSession('current'); } catch (e) {}
          await account.createEmailPasswordSession(email, password);
          const appwriteUser = await account.get();
          const loggedUser = {
            id: appwriteUser.$id,
            name: appwriteUser.name || email.split('@')[0],
            email: appwriteUser.email,
            role: 'ভেরিফাইড ইউজার',
            avatar_emoji: '🧑‍💻',
            loggedIn: true
          };
          setUser(loggedUser);
          localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
          localStorage.setItem('rg_username', loggedUser.name);
          setLoading(false);
          return { success: true, message: 'সফলভাবে লগইন হয়েছে (Appwrite Auth)' };
        } catch (err) {
          console.warn('Appwrite auth error, using standard auth handler:', err);
        }
      }

      // 2. Local Auth Handler / Demo Account Matching
      const isOwner = email.toLowerCase() === 'redgreenonline2023@gmail.com';
      const loggedUser = {
        id: isOwner ? DEFAULT_ADMIN_ACCOUNT.id : 'usr_' + Math.random().toString(36).substr(2, 8),
        name: isOwner ? DEFAULT_ADMIN_ACCOUNT.name : email.split('@')[0].toUpperCase(),
        email: email,
        role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : 'কমিউনিটি সদস্য',
        avatar_emoji: isOwner ? '🧑‍💻' : '🚀',
        loggedIn: true
      };

      setUser(loggedUser);
      localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
      localStorage.setItem('rg_username', loggedUser.name);
      await saveRegisteredUser(loggedUser);
      setLoading(false);
      return { success: true, message: 'সফলভাবে লগইন সম্পন্ন হয়েছে!' };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'লগইন করতে সমস্যা হয়েছে' };
    }
  };

  // Helper getters for Role verification
  const getUserRoleType = () => {
    if (!user) return 'guest';
    const roleStr = (user.role || '').toLowerCase();
    const emailStr = (user.email || '').toLowerCase();

    if (roleStr.includes('অ্যাডমিন') || roleStr.includes('admin') || emailStr === 'redgreenonline2023@gmail.com') {
      return 'admin';
    }
    if (roleStr.includes('মডারেটর') || roleStr.includes('moderator') || emailStr.includes('.mod@')) {
      return 'moderator';
    }
    return 'member';
  };

  const isAdmin = getUserRoleType() === 'admin';
  const isModerator = isAdmin || getUserRoleType() === 'moderator';
  const userRole = getUserRoleType();

  // Register Handler
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      if (isAppwriteConfigured) {
        try {
          await account.create(ID.unique(), email, password, name);
          await account.createEmailPasswordSession(email, password);
          const appwriteUser = await account.get();
          const newUser = {
            id: appwriteUser.$id,
            name: name,
            email: email,
            role: 'নতুন সদস্য',
            avatar_emoji: '🧑‍💻',
            loggedIn: true
          };
          setUser(newUser);
          localStorage.setItem('rg_current_user', JSON.stringify(newUser));
          localStorage.setItem('rg_username', newUser.name);
          setLoading(false);
          return { success: true, message: 'সফলভাবে রেজিস্ট্রেশন ও লগইন সম্পন্ন হয়েছে!' };
        } catch (err) {
          console.warn('Appwrite register fallback:', err);
        }
      }

      // Local Register
      const newUser = {
        id: 'usr_' + Math.random().toString(36).substr(2, 8),
        name: name,
        email: email,
        role: 'নতুন সদস্য',
        avatar_emoji: '🧑‍💻',
        phone: '+880 1700-000000',
        bio: 'rgomassenger এ স্বাগতম!',
        loggedIn: true
      };

      setUser(newUser);
      localStorage.setItem('rg_current_user', JSON.stringify(newUser));
      localStorage.setItem('rg_username', newUser.name);
      await saveRegisteredUser(newUser);
      setLoading(false);
      return { success: true, message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' };
    }
  };

  // Demo Login (1-click)
  const demoLogin = (accountType = 'admin') => {
    let target = DEFAULT_ADMIN_ACCOUNT;
    if (accountType === 'moderator') {
      target = { ...DEFAULT_ADMIN_ACCOUNT, id: 'usr_mod_demo', name: 'মডারেটর (টেস্ট)', role: 'মডারেটর', avatar_emoji: '🦁' };
    } else if (accountType === 'member') {
      target = { ...DEFAULT_ADMIN_ACCOUNT, id: 'usr_mem_demo', name: 'মেম্বার (টেস্ট)', role: 'কমিউনিটি মেম্বার', avatar_emoji: '🚀' };
    }

    const loggedUser = { ...target, loggedIn: true };
    setUser(loggedUser);
    localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
    localStorage.setItem('rg_username', loggedUser.name);
    return { success: true, message: `${loggedUser.name} হিসেবে লগইন সম্পন্ন!` };
  };

  // Get Registered Users List
  const getRegisteredUsers = async () => {
    try {
      let localList = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          localList = JSON.parse(stored);
        }
      }

      // Merge with Supabase profiles
      const { supabase } = await import('../lib/supabase');
      const { data: remoteProfiles } = await supabase.from('profiles').select('*');

      const combinedMap = new Map();
      // Add default admin account
      combinedMap.set(DEFAULT_ADMIN_ACCOUNT.email.toLowerCase(), DEFAULT_ADMIN_ACCOUNT);

      if (localList && Array.isArray(localList)) {
        localList.forEach(u => {
          if (u && u.email) combinedMap.set(u.email.toLowerCase(), u);
        });
      }

      if (remoteProfiles && Array.isArray(remoteProfiles)) {
        remoteProfiles.forEach(rp => {
          if (rp && rp.email) {
            const existing = combinedMap.get(rp.email.toLowerCase()) || {};
            combinedMap.set(rp.email.toLowerCase(), { ...existing, ...rp });
          }
        });
      }

      return Array.from(combinedMap.values());
    } catch (err) {
      console.error('Fetch registered users error:', err);
      return [DEFAULT_ADMIN_ACCOUNT];
    }
  };

  // Delete User
  const deleteUser = async (userId, userEmail) => {
    try {
      // 1. Remove from localStorage rg_all_users
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          let users = JSON.parse(stored);
          users = users.filter(u => u.id !== userId && u.email?.toLowerCase() !== userEmail?.toLowerCase());
          localStorage.setItem('rg_all_users', JSON.stringify(users));
        }
      }

      // 2. Remove from Supabase profiles
      const { supabase } = await import('../lib/supabase');
      if (userId) {
        await supabase.from('profiles').delete().eq('id', userId);
      }
      if (userEmail) {
        await supabase.from('profiles').delete().eq('email', userEmail);
      }

      // 3. If deleting current logged-in user, logout
      if (user && (user.id === userId || user.email?.toLowerCase() === userEmail?.toLowerCase())) {
        await logout();
      }

      return { success: true, message: 'ইউজার সফলভাবে প্ল্যাটফর্ম থেকে মুছে ফেলা হয়েছে।' };
    } catch (err) {
      console.error('Delete user error:', err);
      return { success: false, message: 'ইউজার মুছতে সমস্যা হয়েছে' };
    }
  };

  // Update User Role
  const updateUserRole = async (userId, userEmail, newRole) => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          let users = JSON.parse(stored);
          users = users.map(u => {
            if (u.id === userId || (u.email && u.email.toLowerCase() === userEmail?.toLowerCase())) {
              return { ...u, role: newRole };
            }
            return u;
          });
          localStorage.setItem('rg_all_users', JSON.stringify(users));
        }
      }

      // Update Supabase profiles
      const { supabase } = await import('../lib/supabase');
      if (userId) {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      } else if (userEmail) {
        await supabase.from('profiles').update({ role: newRole }).eq('email', userEmail);
      }

      // If updating current logged in user
      if (user && (user.id === userId || user.email?.toLowerCase() === userEmail?.toLowerCase())) {
        updateProfile({ role: newRole });
      }

      return { success: true, message: 'ইউজার রোল সফলভাবে আপডেট হয়েছে!' };
    } catch (err) {
      console.error('Update user role error:', err);
      return { success: false, message: 'রোল আপডেট করতে সমস্যা হয়েছে' };
    }
  };

  // Logout Handler
  const logout = async () => {
    setLoading(true);
    try {
      if (isAppwriteConfigured) {
        try {
          await account.deleteSession('current');
        } catch (e) {
          console.warn('Appwrite session delete warning:', e);
        }
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('rg_current_user');
      setLoading(false);
    }
  };

  // Update Profile Data
  const updateProfile = (updatedData) => {
    if (!user) return;
    const newUserData = { ...user, ...updatedData };
    setUser(newUserData);
    localStorage.setItem('rg_current_user', JSON.stringify(newUserData));
    if (updatedData.name) {
      localStorage.setItem('rg_username', updatedData.name);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      demoLogin,
      logout,
      updateProfile,
      isAdmin,
      isModerator,
      userRole,
      getUserRoleType,
      getRegisteredUsers,
      deleteUser,
      updateUserRole,
      appLogo,
      updateAppLogo,
      resetAppLogo
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
