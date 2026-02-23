import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../../types';

export const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                fetchTasks();
            } else {
                setLoading(false);
            }
        };

        init();

        // Subscribe to realtime changes
        const subscription = supabase
            .channel('tasks_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks'
            }, () => {
                if (mounted) fetchTasks();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchTasks = async () => {
        try {
            let data, fetchError;

            // Try fetching from view first
            ({ data, error: fetchError } = await supabase
                .from('tasks_with_users')
                .select('*')
                .order('created_at', { ascending: false }));

            // If view extraction fails (likely because view blocks RLS or doesn't exist), fallback to raw table
            if (fetchError) {
                console.warn('View fetch failed, falling back to raw table', fetchError);
                ({ data, error: fetchError } = await supabase
                    .from('tasks')
                    .select('*, responsible:users(name, avatar, role)') // Join with users manually
                    .order('created_at', { ascending: false }));
            }

            if (fetchError) throw fetchError;

            // Transform data to match Task interface
            const transformedTasks: Task[] = (data || []).map((task: any) => ({
                id: task.id,
                title: task.title,
                project: task.project,
                status: task.status,
                priority: task.priority,
                responsible: task.responsible?.name || task.responsible_name || 'Sem responsável',
                startDate: task.start_date,
                dueDate: task.due_date,
                objectives: task.objectives || [],
                completionReport: task.completion_report,
                managerFeedback: task.manager_feedback
            }));

            setTasks(transformedTasks);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createTask = async (taskData: Omit<Task, 'id'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            // Get responsible user ID from users table
            let responsibleId: string | null = null;
            if (taskData.responsible) {
                const { data: responsibleUser } = await supabase
                    .from('users')
                    .select('id, name')
                    .eq('name', taskData.responsible)
                    .single();

                responsibleId = responsibleUser?.id || null;
            }

            const { data, error: insertError } = await supabase
                .from('tasks')
                .insert({
                    title: taskData.title,
                    project: taskData.project,
                    status: taskData.status,
                    priority: taskData.priority,
                    responsible_id: responsibleId,
                    start_date: taskData.startDate,
                    due_date: taskData.dueDate,
                    objectives: taskData.objectives as any
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Create notification for assigned user (if not self-assigned)
            if (responsibleId && responsibleId !== user.id) {
                const { data: currentUser } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single();

                await supabase
                    .from('notifications')
                    .insert({
                        user_id: responsibleId,
                        task_id: data.id,
                        type: 'task_assigned',
                        title: `Nova Tarefa: ${taskData.title}`,
                        description: `Você foi designado para esta tarefa por ${currentUser?.name || 'um gestor'}`
                    } as any);
            }

            console.log('Task created successfully:', data);

            // Immediately refresh tasks to update UI
            await fetchTasks();
        } catch (err: any) {
            console.error('Error creating task:', err);
            setError(err.message);
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        try {
            let responsible_id = undefined;

            if (updates.responsible) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id')
                    .eq('name', updates.responsible)
                    .single();

                responsible_id = users?.id || null;
            }

            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    ...(updates.title && { title: updates.title }),
                    ...(updates.project && { project: updates.project }),
                    ...(updates.status && { status: updates.status }),
                    ...(updates.priority && { priority: updates.priority }),
                    ...(responsible_id !== undefined && { responsible_id }),
                    ...(updates.startDate && { start_date: updates.startDate }),
                    ...(updates.dueDate && { due_date: updates.dueDate }),
                    ...(updates.objectives && { objectives: updates.objectives }),
                    ...(updates.completionReport && { completion_report: updates.completionReport }),
                    ...(updates.managerFeedback && { manager_feedback: updates.managerFeedback })
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Immediately refresh tasks to update UI
            await fetchTasks();
        } catch (err: any) {
            console.error('Error updating task:', err);
            throw err;
        }
    };

    const deleteTask = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            await fetchTasks();
        } catch (err: any) {
            console.error('Error deleting task:', err);
            throw err;
        }
    };

    return {
        tasks,
        loading,
        error,
        createTask,
        updateTask,
        deleteTask,
        refetch: fetchTasks
    };
};
