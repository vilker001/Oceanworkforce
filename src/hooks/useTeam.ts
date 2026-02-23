import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TeamMember } from '../../types';

export const useTeam = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                fetchTeam();
            } else {
                setLoading(false);
            }
        };

        init();

        const subscription = supabase
            .channel('users_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users'
            }, () => {
                if (mounted) fetchTeam();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchTeam = async () => {
        try {
            // 1. Fetch Users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, role, email, avatar, created_at')
                .order('created_at', { ascending: true });

            if (userError) throw userError;

            // 2. Fetch Tasks for Metrics
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select('responsible_id, status, priority');

            if (taskError) throw taskError;

            // 3. Fetch Clients for Metrics
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('responsible_id, name');

            if (clientError) throw clientError;

            // Transform users to TeamMember format with real metrics
            const transformedTeam: TeamMember[] = (userData || []).map((user: any) => {
                // filter tasks for this user
                const userTasks = (taskData || []).filter(t => t.responsible_id === user.id);
                const completed = userTasks.filter(t => t.status === 'Done').length;
                const pending = userTasks.filter(t => t.status !== 'Done' && t.status !== 'Missed').length;
                const missed = userTasks.filter(t => t.status === 'Missed').length;
                const total = userTasks.length;

                // Simple XP/Level logic: 100 XP per completed task
                const xp = completed * 105 + pending * 5; // Bonus for participation
                const level = Math.floor(xp / 1000) + 1;

                // KPI Logic (mocked but based on real task ratios)
                const qualityScore = total > 0 ? Math.round((completed / total) * 100) : 0;
                const speedScore = total > 0 ? Math.min(100, Math.round((completed / total) * 110)) : 0;

                return {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    phone: '+258 8X XXX XXXX',
                    avatar: user.avatar,
                    level,
                    xp,
                    badges: level > 2 ? ['Elite Member', 'Top Performer'] : ['Membro da Equipe'],
                    metrics: {
                        completed,
                        pending,
                        missed,
                        objectivesMet: completed,
                        totalObjectives: total,
                        kpis: [
                            { name: 'Qualidade de Entrega', score: qualityScore },
                            { name: 'Agilidade de Resposta', score: speedScore }
                        ],
                        clients: (clientData || [])
                            .filter(c => c.responsible_id === user.id)
                            .map(c => c.name)
                    }
                };
            });

            setTeam(transformedTeam);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching team:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        team,
        loading,
        error,
        refetch: fetchTeam
    };
};
