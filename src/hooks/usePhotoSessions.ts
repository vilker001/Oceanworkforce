import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PhotoSession, ServiceCatalogItem } from '../../types';

export const usePhotoSessions = () => {
    const [sessions, setSessions] = useState<PhotoSession[]>([]);
    const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) await Promise.all([fetchSessions(), fetchCatalog()]);
            else setLoading(false);
        };
        init();
        const sub = supabase.channel('photo_sessions_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_sessions' }, () => { if (mounted) fetchSessions(); })
            .subscribe();
        return () => { mounted = false; sub.unsubscribe(); };
    }, []);

    const fetchSessions = async () => {
        try {
            const { data, error: err } = await supabase
                .from('photo_sessions')
                .select('*')
                .order('date', { ascending: false });
            if (err) throw err;

            // Get photographer names
            const photogIds = [...new Set((data || []).filter(s => s.photographer_id).map(s => s.photographer_id))];
            let nameMap: Record<string, string> = {};
            if (photogIds.length > 0) {
                const { data: users } = await supabase.from('users').select('id, name').in('id', photogIds);
                (users || []).forEach((u: any) => { nameMap[u.id] = u.name; });
            }

            setSessions((data || []).map((s: any): PhotoSession => ({
                id: s.id, service_type: s.service_type, location_type: s.location_type,
                date: s.date, time: s.time, duration_estimated: s.duration_estimated,
                client_name: s.client_name, client_phone: s.client_phone,
                price_mt: parseFloat(s.price_mt), notes: s.notes, status: s.status,
                photographer_id: s.photographer_id,
                photographer_name: s.photographer_id ? nameMap[s.photographer_id] : undefined,
                created_at: s.created_at,
            })));
            setError(null);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    };

    const fetchCatalog = async () => {
        try {
            const { data, error: err } = await supabase.from('service_catalog').select('*').order('catalog_type');
            if (err) throw err;
            setCatalog((data || []).map((i: any): ServiceCatalogItem => ({
                id: i.id, catalog_type: i.catalog_type, name: i.name,
                description: i.description, price_mt: parseFloat(i.price_mt),
            })));
        } catch (e: any) { console.error(e); }
    };

    const createSession = async (session: Omit<PhotoSession, 'id' | 'created_at'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error: err } = await supabase
            .from('photo_sessions')
            .insert({ ...session, photographer_id: session.photographer_id || user?.id })
            .select().single();
        if (err) throw err;
        await fetchSessions();
        return data;
    };

    const completeSession = async (id: string, session: PhotoSession) => {
        // Mark as executed and split revenue 50/50
        const { error: err } = await supabase.from('photo_sessions').update({ status: 'Executada', updated_at: new Date().toISOString() }).eq('id', id);
        if (err) throw err;

        // Add company portion (50%) to transactions
        const companyRevenue = session.price_mt * 0.5;
        await supabase.from('transactions').insert({
            description: `Sessão de Fotografia - ${session.service_type} (${session.client_name})`,
            date: session.date,
            category: 'Sessão de Fotografia',
            value: companyRevenue,
            type: 'income',
            status: 'Recebido',
        });

        // Award XP to photographer: 150 base + (price / 100)
        const xpEarned = 150 + Math.floor(session.price_mt / 100);
        if (session.photographer_id) {
            await supabase.from('xp_history').insert({
                user_id: session.photographer_id,
                xp_amount: xpEarned,
                reason: `Sessão de fotografia executada: ${session.service_type}`,
            });
        }

        await fetchSessions();
    };

    const deleteSession = async (id: string) => {
        const { error: err } = await supabase.from('photo_sessions').delete().eq('id', id);
        if (err) throw err;
        await fetchSessions();
    };

    const addCatalogItem = async (item: Omit<ServiceCatalogItem, 'id'>) => {
        const { data, error: err } = await supabase.from('service_catalog').insert(item).select().single();
        if (err) throw err;
        await fetchCatalog();
        return data;
    };

    const deleteCatalogItem = async (id: string) => {
        const { error: err } = await supabase.from('service_catalog').delete().eq('id', id);
        if (err) throw err;
        await fetchCatalog();
    };

    return { sessions, catalog, loading, error, createSession, completeSession, deleteSession, addCatalogItem, deleteCatalogItem, refetch: fetchSessions, refetchCatalog: fetchCatalog };
};
