import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, ProjectStage } from '../../types';

export const useProjects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) fetchProjects();
            else setLoading(false);
        };
        init();
        const sub = supabase.channel('projects_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { if (mounted) fetchProjects(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_stages' }, () => { if (mounted) fetchProjects(); })
            .subscribe();
        return () => { mounted = false; sub.unsubscribe(); };
    }, []);

    const fetchProjects = async () => {
        try {
            const { data: projectData, error: pErr } = await supabase
                .from('projects')
                .select('*, project_stages(*)')
                .order('created_at', { ascending: false });
            if (pErr) throw pErr;

            // Fetch client names
            const clientIds = (projectData || []).filter(p => p.client_id).map(p => p.client_id);
            let clientMap: Record<string, string> = {};
            if (clientIds.length > 0) {
                const { data: clientData } = await supabase.from('clients').select('id, name').in('id', clientIds);
                (clientData || []).forEach((c: any) => { clientMap[c.id] = c.name; });
            }

            const transformed: Project[] = (projectData || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                type: p.type,
                client_id: p.client_id,
                client_name: p.client_id ? clientMap[p.client_id] : undefined,
                status: p.status,
                completion_report: p.completion_report,
                completed_at: p.completed_at,
                created_at: p.created_at,
                stages: (p.project_stages || []).map((s: any) => ({
                    id: s.id,
                    project_id: s.project_id,
                    name: s.name,
                    description: s.description,
                    objectives: s.objectives || [],
                    start_date: s.start_date,
                    due_date: s.due_date,
                    status: s.status,
                    relevance: s.relevance,
                    completed_at: s.completed_at,
                })),
            }));
            setProjects(transformed);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'stages'>) => {
        const { data, error: err } = await supabase.from('projects').insert(project).select().single();
        if (err) throw err;
        await fetchProjects();
        return data;
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        const { stages, client_name, ...rest } = updates as any;
        const { error: err } = await supabase.from('projects').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
        if (err) throw err;
        await fetchProjects();
    };

    const deleteProject = async (id: string) => {
        const { error: err } = await supabase.from('projects').delete().eq('id', id);
        if (err) throw err;
        await fetchProjects();
    };

    const createStage = async (stage: Omit<ProjectStage, 'id'>) => {
        const { objectives, ...rest } = stage;
        const { data, error: err } = await supabase.from('project_stages').insert({ ...rest, objectives: objectives }).select().single();
        if (err) throw err;
        await fetchProjects();
        return data;
    };

    const updateStage = async (id: string, updates: Partial<ProjectStage>) => {
        const { error: err } = await supabase.from('project_stages').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
        if (err) throw err;
        await fetchProjects();
    };

    const deleteStage = async (id: string) => {
        const { error: err } = await supabase.from('project_stages').delete().eq('id', id);
        if (err) throw err;
        await fetchProjects();
    };

    return { projects, loading, error, createProject, updateProject, deleteProject, createStage, updateStage, deleteStage, refetch: fetchProjects };
};
