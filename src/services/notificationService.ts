import { supabase } from '../lib/supabase';

export interface NotificationServiceConfig {
    checkIntervalMs?: number; // Default: 3600000 (1 hour)
}

export class NotificationService {
    private intervalId: NodeJS.Timeout | null = null;
    private config: Required<NotificationServiceConfig>;

    constructor(config: NotificationServiceConfig = {}) {
        this.config = {
            checkIntervalMs: config.checkIntervalMs || 3600000 // 1 hour
        };
    }

    /**
     * Start the notification service
     */
    start() {
        if (this.intervalId) {
            console.warn('NotificationService: Already running');
            return;
        }

        console.log('NotificationService: Starting...');

        // Run immediately on start
        this.checkDeadlines();

        // Then run on interval
        this.intervalId = setInterval(() => {
            this.checkDeadlines();
        }, this.config.checkIntervalMs);
    }

    /**
     * Stop the notification service
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('NotificationService: Stopped');
        }
    }

    /**
     * Check all tasks for upcoming/overdue deadlines and create notifications
     */
    private async checkDeadlines() {
        try {
            console.log('NotificationService: Checking deadlines...');

            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('id, title, due_date, responsible_id, status');

            if (tasksError) throw tasksError;
            if (!tasks || tasks.length === 0) return;

            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            for (const task of tasks) {
                // Skip completed tasks
                if (task.status === 'Done') continue;
                if (!task.responsible_id || !task.due_date) continue;

                const dueDate = new Date(task.due_date);
                const diffMs = dueDate.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                // Task is overdue
                if (diffMs < 0) {
                    await this.createNotificationIfNotExists(
                        task.responsible_id,
                        task.id,
                        'task_overdue',
                        `Tarefa Atrasada: ${task.title}`,
                        `Esta tarefa está atrasada desde ${dueDate.toLocaleDateString('pt-BR')}`
                    );
                }
                // Task due today
                else if (diffHours <= 24 && diffHours > 0) {
                    const isToday = dueDate.toDateString() === now.toDateString();

                    if (isToday) {
                        await this.createNotificationIfNotExists(
                            task.responsible_id,
                            task.id,
                            'deadline_today',
                            `Prazo Hoje: ${task.title}`,
                            `Esta tarefa vence hoje às ${dueDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                        );
                    } else {
                        await this.createNotificationIfNotExists(
                            task.responsible_id,
                            task.id,
                            'deadline_24h',
                            `Prazo em 24h: ${task.title}`,
                            `Esta tarefa vence amanhã (${dueDate.toLocaleDateString('pt-BR')})`
                        );
                    }
                }
            }

            console.log('NotificationService: Deadline check complete');
        } catch (err) {
            console.error('NotificationService: Error checking deadlines:', err);
        }
    }

    /**
     * Create notification only if it doesn't already exist
     */
    private async createNotificationIfNotExists(
        userId: string,
        taskId: string,
        type: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue',
        title: string,
        description: string
    ) {
        try {
            // Check if notification already exists (within last 24 hours)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const { data: existing, error: checkError } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('task_id', taskId)
                .eq('type', type)
                .gte('created_at', yesterday.toISOString())
                .limit(1);

            if (checkError) throw checkError;

            // If notification already exists, skip
            if (existing && existing.length > 0) {
                return;
            }

            // Create new notification
            const { error: insertError } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    task_id: taskId,
                    type,
                    title,
                    description
                } as any);

            if (insertError) throw insertError;

            console.log(`NotificationService: Created ${type} notification for task ${taskId}`);
        } catch (err) {
            console.error('NotificationService: Error creating notification:', err);
        }
    }

    /**
     * Create a task assignment notification
     */
    static async notifyTaskAssignment(
        userId: string,
        taskId: string,
        taskTitle: string,
        assignedBy: string
    ) {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    task_id: taskId,
                    type: 'task_assigned',
                    title: `Nova Tarefa Atribuída: ${taskTitle}`,
                    description: `Você foi designado para esta tarefa por ${assignedBy}`
                } as any);

            if (error) throw error;
            console.log(`NotificationService: Task assignment notification sent to ${userId}`);
        } catch (err) {
            console.error('NotificationService: Error creating task assignment notification:', err);
        }
    }
}

// Singleton instance
export const notificationService = new NotificationService();
