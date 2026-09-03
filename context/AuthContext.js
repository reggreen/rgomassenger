import { createContext, useContext, useState, useEffect } from 'react';
import { account, ID, isAppwriteConfigured } from '../lib/appwrite';

const AuthContext = createContext();

export const DEFAULT_ADMIN_ACCOUNT = {
  id: 'usr_admin_01',
  name: 'MD SHANTO',
  nickname: 'Shanto',
  email: 'redgreenonline2023@gmail.com',
  role: 'অ্যাপ ডেভলপার ও চিফ অ্যাডমিন',
  status: 'সিস্টেম মেইন্টেন্যান্স ও অ্যাক্টিভ ⚡',
  presence: 'online',
  avatar_emoji: '🧑‍💻',
  phone: '+880 1700-000000',
  bio: 'অফিস মেসেঞ্জারের ডেভলপার ও চিফ অ্যাডমিন।'
};

export const DEFAULT_REGISTERED_USERS = [
  DEFAULT_ADMIN_ACCOUNT,
  {
    id: 'usr_mem_tanveer',
    name: 'তানভীর আহমেদ',
    nickname: 'তানভীর',
    email: 'tanveer.office@gmail.com',
    role: 'মডারেটর / টিম লিড',
    status: 'কাজের ডেস্কে আছি 📋',
    presence: 'online',
    avatar_emoji: '👨‍💼',
    phone: '+880 1711-223344',
    bio: 'অপারেশনস টিম লিড ও মেসেঞ্জার মডারেটর। প্রতিদিনের অফিস রুটিন সমন্বয়ক।'
  },
  {
    id: 'usr_mem_nusrat',
    name: 'নুসরাত জাহান',
    nickname: 'নুসরাত',
    email: 'nusrat.creative@gmail.com',
    role: 'ডিজাইনার ও ক্রিয়েটিভ',
    status: 'নতুন ইউআই প্রোটোটাইপিং 🎨',
    presence: 'away',
    avatar_emoji: '👩‍🎨',
    phone: '+880 1722-334455',
    bio: 'ইউআই/ইউএক্স ডিজাইনার এবং ব্র্যান্ড এসেট স্পেশালিস্ট।'
  },
  {
    id: 'usr_mem_shahin',
    name: 'শাহিনুর রহমান',
    nickname: 'শাহিন',
    email: 'shahin.dev@gmail.com',
    role: 'সফটওয়্যার ইঞ্জিনিয়ার',
    status: 'বাগ ফিক্সিং ও ডেভলপমেন্ট মোড 🚀',
    presence: 'busy',
    avatar_emoji: '🧑‍💻',
    phone: '+880 1733-445566',
    bio: 'ফুল-স্ট্যাক ওয়েব ডেভেলপার এবং সিস্টেম আর্কিটেক্ট।'
  }
];

export const DEMO_ACCOUNTS = DEFAULT_REGISTERED_USERS;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appLogo, setAppLogo] = useState(null);

  // Check if an email has been removed/banned by Admin
  const isEmailRemoved = (email) => {
    if (!email || typeof window === 'undefined') return false;
    const removedList = localStorage.getItem('rg_removed_users');
    if (!removedList) return false;
    try {
      const parsed = JSON.parse(removedList);
      return parsed.some(e => String(e).toLowerCase() === email.toLowerCase());
    } catch {
      return false;
    }
  };

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

  // Sync user profile to storage and Supabase/Appwrite profiles table
  const saveRegisteredUser = async (userObj) => {
    if (!userObj || !userObj.email) return;
    try {
      // Security Enforcement: Only official owner email can be assigned default Admin
      const isOwner = userObj.email.toLowerCase() === 'redgreenonline2023@gmail.com';
      const safeRole = isOwner ? DEFAULT_ADMIN_ACCOUNT.role : (userObj.role || 'অফিস মেম্বার');
      const safeUserObj = { ...userObj, role: safeRole };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        let users = stored ? JSON.parse(stored) : [DEFAULT_ADMIN_ACCOUNT];
        const existingIdx = users.findIndex(u => u.email.toLowerCase() === userObj.email.toLowerCase());
        if (existingIdx >= 0) {
          // Preserve existing verified role if any
          const existingRole = users[existingIdx].role || safeRole;
          users[existingIdx] = { ...users[existingIdx], ...safeUserObj, role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : existingRole };
        } else {
          users.push(safeUserObj);
        }
        localStorage.setItem('rg_all_users', JSON.stringify(users));
      }

      // Sync to Appwrite/Supabase profiles
      const { appwrite } = await import('../lib/appwrite');
      await appwrite.from('profiles').upsert([{
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: safeRole,
        avatar_emoji: userObj.avatar_emoji || '🧑‍💻',
        phone: userObj.phone || '',
        bio: userObj.bio || ''
      }], { onConflict: 'email' });
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
            if (isEmailRemoved(appwriteUser.email)) {
              await logout();
              return;
            }
            const isOwner = appwriteUser.email.toLowerCase() === 'redgreenonline2023@gmail.com';
            const mappedUser = {
              id: appwriteUser.$id,
              name: appwriteUser.name || (isOwner ? DEFAULT_ADMIN_ACCOUNT.name : 'অফিস মেম্বার'),
              email: appwriteUser.email,
              role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : 'অফিস মেম্বার',
              avatar_emoji: isOwner ? '🧑‍💻' : '👤',
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
            if (isEmailRemoved(parsed.email)) {
              await logout();
              return;
            }
            setUser({ ...parsed, loggedIn: true });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Invalid local user data:', e);
          }
        }
      }

      // 3. Unauthenticated default
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
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        setLoading(false);
        return { success: false, message: 'অনুগ্রহ করে ইমেইল লিখুন।' };
      }

      if (isEmailRemoved(cleanEmail)) {
        setLoading(false);
        return { success: false, message: 'আপনার অ্যাকাউন্টটি অফিস অ্যাডমিন কর্তৃক রিমুভ করা হয়েছে। প্রবেশাধিকার নেই।' };
      }

      // 1. Try Appwrite Authentication
      if (isAppwriteConfigured) {
        try {
          try { await account.deleteSession('current'); } catch (e) {}
          await account.createEmailPasswordSession(cleanEmail, password);
          const appwriteUser = await account.get();
          const isOwner = appwriteUser.email.toLowerCase() === 'redgreenonline2023@gmail.com';
          const loggedUser = {
            id: appwriteUser.$id,
            name: appwriteUser.name || (isOwner ? DEFAULT_ADMIN_ACCOUNT.name : cleanEmail.split('@')[0]),
            email: appwriteUser.email,
            role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : 'অফিস মেম্বার',
            avatar_emoji: isOwner ? '🧑‍💻' : '👤',
            loggedIn: true
          };
          setUser(loggedUser);
          localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
          localStorage.setItem('rg_username', loggedUser.name);
          await saveRegisteredUser(loggedUser);
          setLoading(false);
          return { success: true, message: 'সফলভাবে লগইন হয়েছে' };
        } catch (err) {
          console.warn('Appwrite auth error, using standard auth handler:', err);
        }
      }

      // 2. Local Auth Handler / Registered Matching
      const isOwner = cleanEmail === 'redgreenonline2023@gmail.com';
      
      // Check existing user profile
      let existingProfile = null;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          try {
            const users = JSON.parse(stored);
            existingProfile = users.find(u => u.email?.toLowerCase() === cleanEmail);
          } catch (e) {}
        }
      }

      const loggedUser = {
        id: isOwner ? DEFAULT_ADMIN_ACCOUNT.id : (existingProfile?.id || 'usr_' + Math.random().toString(36).substr(2, 8)),
        name: isOwner ? DEFAULT_ADMIN_ACCOUNT.name : (existingProfile?.name || cleanEmail.split('@')[0].toUpperCase()),
        email: cleanEmail,
        role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : (existingProfile?.role || 'অফিস মেম্বার'),
        avatar_emoji: isOwner ? '🧑‍💻' : (existingProfile?.avatar_emoji || '👤'),
        phone: existingProfile?.phone || '',
        bio: existingProfile?.bio || '',
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

    if (roleStr.includes('অ্যাডমিন') || roleStr.includes('admin') || roleStr.includes('ডেভলপার') || emailStr === 'redgreenonline2023@gmail.com') {
      return 'admin';
    }
    if (roleStr.includes('মডারেটর') || roleStr.includes('moderator')) {
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
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        setLoading(false);
        return { success: false, message: 'অনুগ্রহ করে ইমেইল প্রদান করুন।' };
      }

      if (isEmailRemoved(cleanEmail)) {
        setLoading(false);
        return { success: false, message: 'আপনার অ্যাকাউন্টটি অফিস অ্যাডমিন কর্তৃক রিমুভ করা হয়েছে।' };
      }

      const isOwner = cleanEmail === 'redgreenonline2023@gmail.com';

      if (isAppwriteConfigured) {
        try {
          await account.create(ID.unique(), cleanEmail, password, name);
          await account.createEmailPasswordSession(cleanEmail, password);
          const appwriteUser = await account.get();
          const newUser = {
            id: appwriteUser.$id,
            name: name,
            email: cleanEmail,
            role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : 'অফিস মেম্বার',
            avatar_emoji: isOwner ? '🧑‍💻' : '👤',
            loggedIn: true
          };
          setUser(newUser);
          localStorage.setItem('rg_current_user', JSON.stringify(newUser));
          localStorage.setItem('rg_username', newUser.name);
          await saveRegisteredUser(newUser);
          setLoading(false);
          return { success: true, message: 'সফলভাবে রেজিস্ট্রেশন ও লগইন সম্পন্ন হয়েছে!' };
        } catch (err) {
          console.warn('Appwrite register fallback:', err);
        }
      }

      // Local Register
      const newUser = {
        id: isOwner ? DEFAULT_ADMIN_ACCOUNT.id : 'usr_' + Math.random().toString(36).substr(2, 8),
        name: name,
        email: cleanEmail,
        role: isOwner ? DEFAULT_ADMIN_ACCOUNT.role : 'অফিস মেম্বার',
        avatar_emoji: isOwner ? '🧑‍💻' : '👤',
        phone: '',
        bio: 'অফিস মেম্বার',
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

  // Demo Login (Quick Office Admin Login)
  const demoLogin = (accountType = 'admin') => {
    let target = DEFAULT_ADMIN_ACCOUNT;
    if (accountType === 'member') {
      target = { 
        id: 'usr_office_member_01', 
        name: 'তানভীর আহমেদ', 
        email: 'tanveer.office@gmail.com', 
        role: 'অফিস মেম্বার', 
        avatar_emoji: '👨‍💼',
        phone: '+880 1711-223344',
        bio: 'অফিস টিম মেম্বার'
      };
    }

    const loggedUser = { ...target, loggedIn: true };
    setUser(loggedUser);
    localStorage.setItem('rg_current_user', JSON.stringify(loggedUser));
    localStorage.setItem('rg_username', loggedUser.name);
    saveRegisteredUser(loggedUser);
    return { success: true, message: `${loggedUser.name} হিসেবে লগইন সম্পন্ন!` };
  };

  // Get Registered Users List (Office Members Directory)
  const getRegisteredUsers = async () => {
    try {
      let localList = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          localList = JSON.parse(stored);
        }
      }

      // Merge with Appwrite profiles
      const { appwrite } = await import('../lib/appwrite');
      const { data: remoteProfiles } = await appwrite.from('profiles').select('*');

      const combinedMap = new Map();
      // Always include Default Registered Users (including Developer/Chief Admin)
      DEFAULT_REGISTERED_USERS.forEach(u => {
        if (u && u.email && !isEmailRemoved(u.email)) {
          combinedMap.set(u.email.toLowerCase(), u);
        }
      });

      if (localList && Array.isArray(localList)) {
        localList.forEach(u => {
          if (u && u.email && !isEmailRemoved(u.email)) {
            combinedMap.set(u.email.toLowerCase(), u);
          }
        });
      }

      if (remoteProfiles && Array.isArray(remoteProfiles)) {
        remoteProfiles.forEach(rp => {
          if (rp && rp.email && !isEmailRemoved(rp.email)) {
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

  // Remove Member Completely from the Entire App (Admin Exclusive)
  const removeMemberFromApp = async (userId, userEmail) => {
    try {
      if (!userEmail) return { success: false, message: 'ইউজার ইমেইল পাওয়া যায়নি।' };
      
      const cleanEmail = userEmail.toLowerCase();
      if (cleanEmail === 'redgreenonline2023@gmail.com') {
        return { success: false, message: 'প্রধান ডেভলপার ও চিফ অ্যাডমিন অ্যাকাউন্ট রিমুভ করা যাবে না।' };
      }

      // 1. Add to blacklist / removed list in localStorage
      if (typeof window !== 'undefined') {
        const currentRemoved = localStorage.getItem('rg_removed_users');
        let removedArray = currentRemoved ? JSON.parse(currentRemoved) : [];
        if (!removedArray.includes(cleanEmail)) {
          removedArray.push(cleanEmail);
          localStorage.setItem('rg_removed_users', JSON.stringify(removedArray));
        }

        // Remove from rg_all_users
        const stored = localStorage.getItem('rg_all_users');
        if (stored) {
          let users = JSON.parse(stored);
          users = users.filter(u => u.id !== userId && u.email?.toLowerCase() !== cleanEmail);
          localStorage.setItem('rg_all_users', JSON.stringify(users));
        }

        // Remove from all custom groups
        const storedGroups = localStorage.getItem('rg_custom_groups');
        if (storedGroups) {
          try {
            let groups = JSON.parse(storedGroups);
            groups = groups.map(g => ({
              ...g,
              members: (g.members || []).filter(m => m.toLowerCase() !== cleanEmail)
            }));
            localStorage.setItem('rg_custom_groups', JSON.stringify(groups));
          } catch (e) {}
        }
      }

      // 2. Remove from Appwrite profiles
      const { appwrite } = await import('../lib/appwrite');
      if (userId) {
        await appwrite.from('profiles').delete().eq('id', userId);
      }
      await appwrite.from('profiles').delete().eq('email', cleanEmail);

      // 3. If removing currently logged-in user, force logout
      if (user && (user.id === userId || user.email?.toLowerCase() === cleanEmail)) {
        await logout();
      }

      // 4. Dispatch custom event for real-time notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rg_member_removed', { detail: { email: cleanEmail, id: userId } }));
      }

      return { success: true, message: `${userEmail} কে সম্পূর্ণ অফিস অ্যাপ থেকে রিমুভ করা হয়েছে।` };
    } catch (err) {
      console.error('Remove member error:', err);
      return { success: false, message: 'মেম্বার রিমুভ করতে সমস্যা হয়েছে' };
    }
  };

  // Admin Full Profile Update (Admin can edit any member's profile)
  const adminUpdateUserProfile = async (userId, userEmail, updatedFields) => {
    try {
      const cleanEmail = (userEmail || '').toLowerCase();
      if (!cleanEmail) return { success: false, message: 'ইমেইল আবশ্যক' };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_all_users');
        let users = stored ? JSON.parse(stored) : [...DEFAULT_REGISTERED_USERS];
        let found = false;
        users = users.map(u => {
          if (u.id === userId || u.email?.toLowerCase() === cleanEmail) {
            found = true;
            return { ...u, ...updatedFields };
          }
          return u;
        });
        if (!found) {
          const matchedDefault = DEFAULT_REGISTERED_USERS.find(u => u.email?.toLowerCase() === cleanEmail) || {};
          users.push({ ...matchedDefault, id: userId || 'usr_' + Date.now(), email: cleanEmail, ...updatedFields });
        }
        localStorage.setItem('rg_all_users', JSON.stringify(users));
        window.dispatchEvent(new CustomEvent('rg_user_updated', { detail: { email: cleanEmail, fields: updatedFields } }));
      }

      // Update Appwrite / Supabase profiles
      const { appwrite } = await import('../lib/appwrite');
      await appwrite.from('profiles').upsert([{
        id: userId,
        email: cleanEmail,
        ...updatedFields
      }], { onConflict: 'email' });

      // If updating currently logged in user
      if (user && (user.id === userId || user.email?.toLowerCase() === cleanEmail)) {
        const updated = { ...user, ...updatedFields };
        setUser(updated);
        localStorage.setItem('rg_current_user', JSON.stringify(updated));
        if (updatedFields.name) {
          localStorage.setItem('rg_username', updatedFields.name);
        }
      }

      return { success: true, message: 'মেম্বারের প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' };
    } catch (err) {
      console.error('Admin update user profile error:', err);
      return { success: false, message: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে' };
    }
  };

  // Delete User (alias to removeMemberFromApp)
  const deleteUser = async (userId, userEmail) => {
    return removeMemberFromApp(userId, userEmail);
  };

  // Update User Role
  const updateUserRole = async (userId, userEmail, newRole) => {
    return adminUpdateUserProfile(userId, userEmail, { role: newRole });
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

  // Update Profile Data (Self edit by Member)
  const updateProfile = (updatedData) => {
    if (!user) return;
    const isOwner = (user.email || '').toLowerCase() === 'redgreenonline2023@gmail.com';
    const isCurrentAdmin = (user.role || '').toLowerCase().includes('admin') || (user.role || '').toLowerCase().includes('অ্যাডমিন') || isOwner;
    
    // Regular members cannot modify their own assigned role/designation
    const sanitizedData = { ...updatedData };
    if (!isCurrentAdmin && sanitizedData.role) {
      delete sanitizedData.role;
    }

    const newUserData = { ...user, ...sanitizedData };
    setUser(newUserData);
    localStorage.setItem('rg_current_user', JSON.stringify(newUserData));
    if (sanitizedData.name) {
      localStorage.setItem('rg_username', sanitizedData.name);
    }

    // Sync to rg_all_users and profiles
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rg_all_users');
      let users = stored ? JSON.parse(stored) : [...DEFAULT_REGISTERED_USERS];
      let found = false;
      users = users.map(u => {
        if (u.email?.toLowerCase() === user.email?.toLowerCase() || (user.id && u.id === user.id)) {
          found = true;
          return { ...u, ...sanitizedData };
        }
        return u;
      });
      if (!found) {
        users.push(newUserData);
      }
      localStorage.setItem('rg_all_users', JSON.stringify(users));
      window.dispatchEvent(new CustomEvent('rg_user_updated', { detail: { email: user.email?.toLowerCase(), fields: sanitizedData } }));
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
      adminUpdateUserProfile,
      removeMemberFromApp,
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
