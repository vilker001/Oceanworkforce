import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!(import.meta as any).env?.VITE_SUPABASE_URL || !(import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
    console.error('CRITICAL: Missing Supabase environment variables! VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined in the build process. Please check your Vercel Environment Variables.');
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: true,
    },
});

// Helper function to get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
}
