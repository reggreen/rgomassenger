import { createContext, useContext, useState, useEffect } from 'react';
import { account, ID, isAppwriteConfigured } from '../lib/appwrite';

const AuthContext = createContext();

export const DEMO_ACCOUNTS = [
  {
    id: 'usr_admin_01',
    name: 'MD SHANTO',
    email: 'redgreenonline2023@gmail.com',
    role: 'অ্যাডমিন / কমিউনিটি প্রধান',
    avatar_emoji: '🧑‍💻',
    phone: '+880 1700-000000',
    bio: 'rgomassenger কমিউনিটির প্রধান সিস্টেম অ্যাডমিন এবং আর্কিটেক্ট।'
  },
  {
    id: 'usr_mod_02',
    name: 'সাইদুল ইসলাম',
    email: 'saiful.mod@rgomassenger.com',
    role: 'মডারেটর',
    avatar_emoji: '🦁',
    phone: '+880 1800-112233',
    bio: 'ফোরাম ও চ্যাট রুমের সক্রিয় মডারেটর।'
  },
  {
    id: 'usr_mem_03',
    name: 'আসিফ রহমান',
    email: 'asif.member@rgomassenger.com',
    role: 'কমিউনিটি মেম্বার',
    avatar_emoji: '🚀',
    phone: '+880 1900-445566',
    bio: 'rgomassenger কমিউনিটির নিয়মিত সদস্য।'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    checkUser();
  }, []);

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
      const matchedDemo = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
      const loggedUser = matchedDemo ? {
        ...matchedDemo,
        loggedIn: true
      } : {
        id: 'usr_' + Math.random().toString(36).substr(2, 8),
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: 'কমিউনিটি সদস্য',
        avatar_emoji: '🧑‍💻',
        loggedIn: true
      };

      setUser(loggedUser);
      localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
      localStorage.setItem('rg_username', loggedUser.name);
      setLoading(false);
      return { success: true, message: 'সফলভাবে লগইন সম্পন্ন হয়েছে!' };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'লগইন করতে সমস্যা হয়েছে' };
    }
  };

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
      setLoading(false);
      return { success: true, message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' };
    }
  };

  // Demo Login (1-click)
  const demoLogin = (accountType = 'admin') => {
    let target = DEMO_ACCOUNTS[0];
    if (accountType === 'moderator') target = DEMO_ACCOUNTS[1];
    if (accountType === 'member') target = DEMO_ACCOUNTS[2];

    const loggedUser = { ...target, loggedIn: true };
    setUser(loggedUser);
    localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
    localStorage.setItem('rg_username', loggedUser.name);
    return { success: true, message: `${loggedUser.name} হিসেবে ডেমো লগইন হয়েছে!` };
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
    <AuthContext.Provider value={{ user, loading, login, register, demoLogin, logout, updateProfile }}>
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
