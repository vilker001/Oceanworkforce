import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { XpHistoryEntry, TeamGoal, MonthlyTitle } from '../../types';

export const useGamification = () => {
    const [xpHistory, setXpHistory] = useState<XpHistoryEntry[]>([]);
    const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
    const [monthlyTitles, setMonthlyTitles] = useState<MonthlyTitle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) await Promise.all([fetchXpHistory(), fetchTeamGoals(), fetchMonthlyTitles()]);
            else setLoading(false);
        };
        init();
        return () => { mounted = false; };
    }, []);

    const fetchXpHistory = async () => {
        try {
            const { data, error: err } = await supabase.from('xp_history').select('*').order('created_at', { ascending: false });
            if (err) throw err;
            setXpHistory((data || []) as XpHistoryEntry[]);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchTeamGoals = async () => {
        try {
            const { data, error: err } = await supabase.from('team_goals').select('*').order('month', { ascending: false });
            if (err) throw err;
            setTeamGoals((data || []).map((g: any): TeamGoal => ({
                id: g.id, month: g.month, target_xp: g.target_xp, current_xp: g.current_xp, achieved: g.achieved,
            })));
        } catch (e) { console.error(e); }
    };

    const fetchMonthlyTitles = async () => {
        try {
            const { data, error: err } = await supabase.from('monthly_titles').select('*, users(name)').order('month', { ascending: false });
            if (err) throw err;
            setMonthlyTitles((data || []).map((t: any): MonthlyTitle => ({
                id: t.id, month: t.month, title_type: t.title_type, user_id: t.user_id,
                user_name: t.users?.name, xp_awarded: t.xp_awarded,
            })));
        } catch (e) { console.error(e); }
    };

    const awardXp = async (userId: string, amount: number, reason: string) => {
        await supabase.from('xp_history').insert({ user_id: userId, xp_amount: amount, reason });
        await fetchXpHistory();
    };

    const createTeamGoal = async (month: string, target_xp: number) => {
        const { error: err } = await supabase.from('team_goals').upsert({ month, target_xp, current_xp: 0, achieved: false }, { onConflict: 'month' });
        if (err) throw err;
        await fetchTeamGoals();
    };

    // Calculate per-user XP from xp_history
    const getUserXp = (userId: string) => xpHistory.filter(e => e.user_id === userId).reduce((sum, e) => sum + e.xp_amount, 0);

    const currentMonthXp = () => {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return xpHistory.filter(e => e.created_at.startsWith(monthStr)).reduce((sum, e) => sum + e.xp_amount, 0);
    };

    return { xpHistory, teamGoals, monthlyTitles, loading, awardXp, createTeamGoal, getUserXp, currentMonthXp, refetch: fetchXpHistory };
};
