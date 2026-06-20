import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Check for missing or placeholder credentials
export const isMissingSupabaseConfig = !supabaseUrl || !supabaseAnonKey ||
    supabaseUrl === 'https://placeholder.supabase.co' ||
    supabaseAnonKey === 'placeholder';

if (isMissingSupabaseConfig) {
    console.error(
        'CRITICAL: Variáveis de ambiente do Supabase não configuradas!\n' +
        'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do Vercel.\n' +
        'Acesse: https://vercel.com > Seu Projeto > Settings > Environment Variables'
    );
}

// Use safe fallback URLs so createClient doesn't throw on empty strings
export const supabase = createClient<any>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: false,
            autoRefreshToken: true,
        },
    }
);

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
