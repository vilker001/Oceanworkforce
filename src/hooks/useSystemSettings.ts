import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SystemSettings, FixedExpense } from '../../types';

export const useSystemSettings = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                await Promise.all([fetchSettings(), fetchFixedExpenses()]);
            } else {
                setLoading(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error: err } = await supabase
                .from('system_settings')
                .select('*')
                .limit(1)
                .single();
            if (err && err.code !== 'PGRST116') throw err;
            if (data) setSettings({ id: data.id, exchange_rate: parseFloat(data.exchange_rate) });
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchFixedExpenses = async () => {
        try {
            const { data, error: err } = await supabase
                .from('fixed_expenses')
                .select('*')
                .order('name');
            if (err) throw err;
            setFixedExpenses((data || []).map((e: any) => ({ id: e.id, name: e.name, value_mt: parseFloat(e.value_mt) })));
        } catch (e: any) {
            console.error('Error fetching fixed expenses:', e);
        }
    };

    const updateExchangeRate = async (rate: number) => {
        if (!settings) return;
        const { error: err } = await supabase
            .from('system_settings')
            .update({ exchange_rate: rate, updated_at: new Date().toISOString() })
            .eq('id', settings.id);
        if (err) throw err;
        setSettings(prev => prev ? { ...prev, exchange_rate: rate } : null);
    };

    const addFixedExpense = async (name: string, value_mt: number) => {
        const { data, error: err } = await supabase
            .from('fixed_expenses')
            .insert({ name, value_mt })
            .select()
            .single();
        if (err) throw err;
        setFixedExpenses(prev => [...prev, { id: data.id, name: data.name, value_mt: parseFloat(data.value_mt) }]);
    };

    const deleteFixedExpense = async (id: string) => {
        const { error: err } = await supabase.from('fixed_expenses').delete().eq('id', id);
        if (err) throw err;
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
    };

    const totalFixedExpenses = fixedExpenses.reduce((sum, e) => sum + e.value_mt, 0);
    const breakevenSuggestion = totalFixedExpenses * 1.3;

    return { settings, fixedExpenses, loading, error, updateExchangeRate, addFixedExpense, deleteFixedExpense, totalFixedExpenses, breakevenSuggestion, refetch: fetchSettings };
};
