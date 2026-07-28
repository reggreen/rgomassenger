// =========================================================================
// SUPABASE CONNECTOR (MIGRATED TO APPWRITE BACKEND)
// Note: Original Supabase configuration has been preserved in /lib/supabase.backup.js
// =========================================================================

import { appwrite, isAppwriteConfigured, sendTypingStatus as sendAppwriteTyping } from './appwrite';

export const isSupabaseConfigured = isAppwriteConfigured;
export const sendTypingStatus = sendAppwriteTyping;
export const supabase = appwrite;

export default appwrite;
