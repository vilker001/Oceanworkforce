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
            const transformedTasks: Task[] = (data || []).map((task: any) => {
                let isLate = false;
                if (task.status !== 'Done') {
                    const dueDate = new Date(task.due_date);
                    dueDate.setHours(23, 59, 59, 999);
                    if (dueDate < new Date()) {
                        isLate = true;
                    }
                }

                return {
                    id: task.id,
                    title: task.title,
                    project: task.project,
                    status: task.status,
                    priority: task.priority,
                    responsible: task.responsible?.name || task.responsible_name || '',
                    responsible_id: task.responsible_id,
                    startDate: task.start_date,
                    dueDate: task.due_date,
                    objectives: task.objectives || [],
                    completionReport: task.completion_report,
                    managerFeedback: task.manager_feedback,
                    isLate,
                    relevance: task.relevance || 3,
                    delegated_by: task.delegated_by,
                    delegated_by_name: task.delegated_by_name,
                    urgency: task.urgency || 'Média',
                    completed_at: task.completed_at
                };
            });

            // Fetch Project Stages
            const { data: stagesData } = await supabase
                .from('project_stages')
                .select('*, project:projects(name)')
                .order('start_date', { ascending: false });

            const transformedStages: Task[] = (stagesData || []).map((stage: any) => {
                let isLate = false;
                if (stage.status !== 'Concluido') {
                    const dueDate = new Date(stage.due_date);
                    dueDate.setHours(23, 59, 59, 999);
                    if (dueDate < new Date()) {
                        isLate = true;
                    }
                }

                const statusMap: any = { 'A Fazer': 'ToDo', 'Em Progresso': 'InProgress', 'Concluido': 'Done' };

                return {
                    id: `stage-${stage.id}`,
                    title: stage.name,
                    project: stage.project?.name || 'Projeto Desconhecido',
                    status: statusMap[stage.status] || 'ToDo',
                    priority: 'ALTA',
                    responsible: stage.responsible_name || '',
                    responsible_id: stage.responsible_id,
                    startDate: stage.start_date,
                    dueDate: stage.due_date,
                    objectives: stage.objectives || [],
                    isLate,
                    relevance: stage.relevance || 4,
                    delegated_by: stage.delegated_by,
                    delegated_by_name: 'Gestor',
                    urgency: 'Alta',
                    completed_at: stage.completed_at
                };
            });

            const allTasks = [...transformedTasks, ...transformedStages].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setTasks(allTasks);
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
                    objectives: taskData.objectives as any,
                    relevance: taskData.relevance || 3,
                    urgency: taskData.urgency || 'Média',
                    delegated_by: user.id
                } as any)
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
            if (id.startsWith('stage-')) {
                const realId = id.replace('stage-', '');
                
                const { data: currentStage } = await supabase
                    .from('project_stages')
                    .select('*')
                    .eq('id', realId)
                    .single();

                const invStatusMap: any = { 'ToDo': 'A Fazer', 'InProgress': 'Em Progresso', 'Review': 'Em Progresso', 'Done': 'Concluido', 'Backlog': 'A Fazer' };
                const newStatus = updates.status ? invStatusMap[updates.status] : undefined;

                const isCompleting = newStatus === 'Concluido' && currentStage && currentStage.status !== 'Concluido';
                const completed_at = isCompleting ? new Date().toISOString() : undefined;

                let respId = updates.responsible_id !== undefined ? updates.responsible_id : currentStage?.responsible_id;
                let respName = updates.responsible !== undefined ? updates.responsible : currentStage?.responsible_name;

                const { error: updateError } = await supabase
                    .from('project_stages')
                    .update({
                        ...(updates.title && { name: updates.title }),
                        ...(newStatus && { status: newStatus }),
                        ...(updates.startDate && { start_date: updates.startDate }),
                        ...(updates.dueDate && { due_date: updates.dueDate }),
                        ...(updates.objectives && { objectives: updates.objectives as any }),
                        ...(updates.responsible !== undefined && { responsible_id: respId, responsible_name: respName }),
                        ...(completed_at && { completed_at })
                    })
                    .eq('id', realId);

                if (updateError) throw updateError;

                if (isCompleting && currentStage) {
                    const targetUserId = respId || currentStage.responsible_id;
                    if (targetUserId) {
                        await supabase.from('xp_history').insert({
                            user_id: targetUserId,
                            xp_amount: 150,
                            reason: `Etapa de Projeto concluída: ${currentStage.name}`
                        });
                    }
                }
                
                await fetchTasks();
                return;
            }

            let responsible_id = updates.responsible_id !== undefined ? updates.responsible_id : undefined;

            if (responsible_id === undefined && updates.responsible !== undefined) {
                if (updates.responsible) {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id')
                        .eq('name', updates.responsible)
                        .single();

                    responsible_id = users?.id || null;
                } else {
                    responsible_id = null;
                }
            }

            // Fetch current task to see if status is changing to Done
            const { data: currentTask } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .single();

            const isCompleting = updates.status === 'Done' && currentTask && currentTask.status !== 'Done';
            const completed_at = isCompleting ? new Date().toISOString() : undefined;

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
                    ...(updates.managerFeedback && { manager_feedback: updates.managerFeedback }),
                    ...(completed_at && { completed_at })
                } as any)
                .eq('id', id);

            if (updateError) throw updateError;

            // Handle XP awards and Notifications when completed
            if (isCompleting && currentTask) {
                const targetUserId = currentTask.responsible_id;
                
                if (targetUserId) {
                    // 1. Award base XP (+100 XP)
                    await supabase.from('xp_history').insert({
                        user_id: targetUserId,
                        xp_amount: 100,
                        reason: `Tarefa concluída: ${currentTask.title}`
                    });

                    // 2. Check and award early completion bonus (+relevance * 10 XP)
                    if (currentTask.due_date) {
                        const dueDate = new Date(currentTask.due_date);
                        const completedAt = new Date();
                        const timeDiff = dueDate.getTime() - completedAt.getTime();
                        const hoursBefore = timeDiff / (1000 * 60 * 60);

                        if (hoursBefore >= 24) {
                          const bonusAmount = (currentTask.relevance || 3) * 10;
                          await supabase.from('xp_history').insert({
                              user_id: targetUserId,
                              xp_amount: bonusAmount,
                              reason: `Bónus de Antecedência (+24h): Conclusão de tarefa: ${currentTask.title}`
                          });
                        }
                    }
                }

                // 3. Notify the delegator in real-time
                if (currentTask.delegated_by && currentTask.delegated_by !== currentTask.responsible_id) {
                    const { data: worker } = await supabase
                        .from('users')
                        .select('name')
                        .eq('id', currentTask.responsible_id)
                        .single();

                    await supabase.from('notifications').insert({
                        user_id: currentTask.delegated_by,
                        task_id: id,
                        type: 'task_completed',
                        title: `Tarefa Concluída: ${currentTask.title}`,
                        description: `O colaborador ${worker?.name || 'responsável'} concluiu a tarefa designada.`
                    } as any);
                }
            }

            // Immediately refresh tasks to update UI
            await fetchTasks();
        } catch (err: any) {
            console.error('Error updating task:', err);
            throw err;
        }
    };

    const deleteTask = async (id: string) => {
        try {
            if (id.startsWith('stage-')) {
                const realId = id.replace('stage-', '');
                const { error: deleteError } = await supabase.from('project_stages').delete().eq('id', realId);
                if (deleteError) throw deleteError;
            } else {
                const { error: deleteError } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', id);

                if (deleteError) throw deleteError;
            }

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
