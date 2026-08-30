// =========================================================================
// UNIVERSAL DATABASE & REALTIME BRIDGE (APPWRITE BACKEND ENGINE)
// =========================================================================

import { appwrite, appwriteService, sendTypingStatus as appwriteSendTyping, isAppwriteConfigured } from './appwrite';

export const isSupabaseConfigured = isAppwriteConfigured;
export const supabase = appwriteService;
export const sendTypingStatus = appwriteSendTyping;

export default appwriteService;
