import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DailyReport, User } from '../../types';

export const useDailyReports = (currentUser: User | null) => {
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            if (mounted && currentUser) {
                fetchReports();
            } else {
                setLoading(false);
            }
        };
        init();

        const subscription = supabase
            .channel('daily_reports_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_reports' }, () => {
                if (mounted) fetchReports();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [currentUser]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const isManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(currentUser?.role || '');
            
            let query = supabase.from('daily_reports').select('*, user:users(name)').order('date', { ascending: false });
            
            if (!isManager && currentUser) {
                query = query.eq('user_id', currentUser.id);
            }
            
            const { data, error: err } = await query;
            if (err) throw err;

            const transformed: DailyReport[] = (data || []).map((r: any) => ({
                id: r.id,
                user_id: r.user_id,
                date: r.date,
                description: r.description,
                hours_dedicated: parseFloat(r.hours_dedicated),
                expected_output: r.expected_output,
                manager_feedback: r.manager_feedback,
                created_at: r.created_at,
                updated_at: r.updated_at,
                user_name: r.user?.name || 'Desconhecido'
            }));

            setReports(transformed);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching reports:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createReport = async (report: Omit<DailyReport, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'user_name'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error: err } = await supabase
                .from('daily_reports')
                .insert({
                    user_id: user.id,
                    ...report
                })
                .select()
                .single();

            if (err) throw err;
            await fetchReports();
            return data;
        } catch (err: any) {
            console.error('Error creating report:', err);
            throw err;
        }
    };

    const updateReport = async (id: string, updates: Partial<DailyReport>) => {
        try {
            const { error: err } = await supabase
                .from('daily_reports')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (err) throw err;
            await fetchReports();
        } catch (err: any) {
            console.error('Error updating report:', err);
            throw err;
        }
    };

    const deleteReport = async (id: string) => {
        try {
            const { error: err } = await supabase.from('daily_reports').delete().eq('id', id);
            if (err) throw err;
            await fetchReports();
        } catch (err: any) {
            console.error('Error deleting report:', err);
            throw err;
        }
    };

    return {
        reports,
        loading,
        error,
        createReport,
        updateReport,
        deleteReport,
        refetch: fetchReports
    };
};
