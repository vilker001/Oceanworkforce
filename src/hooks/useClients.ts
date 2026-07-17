import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Client, ClientStatus } from '../../types';

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                fetchClients();
            } else {
                setLoading(false);
            }
        };

        init();

        const subscription = supabase
            .channel('clients_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'clients'
            }, () => {
                if (mounted) fetchClients();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('clients_with_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedClients: Client[] = (data || []).map((client: any) => ({
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                companyPhone: client.company_phone,
                companyName: client.company_name,
                nuit: client.nuit,
                businessValue: client.business_value ? parseFloat(client.business_value) : undefined,
                nextFollowUpDate: client.next_follow_up_date,
                internalContact: client.internal_contact,
                internalContactPhone: client.internal_contact_phone,
                internalContactRole: client.internal_contact_role,
                clientResponsibleName: client.client_responsible_name,
                clientResponsiblePhone: client.client_responsible_phone,
                status: client.status as ClientStatus,
                responsible: client.responsible_name || '',
                services: client.services || [],
                location: client.location,
                provenance: client.provenance,
                lastActivity: client.last_activity,
                initials: client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
            }));

            setClients(transformedClients);
            setError(null);
            
            // Auto-create follow-up tasks in background
            if (transformedClients.length > 0) {
                checkAndCreateFollowUpTasks(transformedClients);
            }

        } catch (err: any) {
            console.error('Error fetching clients:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkAndCreateFollowUpTasks = async (clientsData: Client[]) => {
        const today = new Date().toISOString().split('T')[0];
        const clientsToFollowUp = clientsData.filter(c => 
            c.nextFollowUpDate === today && 
            !['Convertido', 'Perdido'].includes(c.status)
        );

        if (clientsToFollowUp.length === 0) return;

        try {
            // Fetch existing tasks to avoid duplicates
            const { data: existingTasks } = await supabase
                .from('tasks')
                .select('title')
                .eq('project', 'CRM Follow-Up')
                .eq('start_date', today);
            
            const existingTitles = new Set((existingTasks || []).map((t: any) => t.title));

            for (const client of clientsToFollowUp) {
                const title = `Follow-Up: ${client.name}`;
                if (!existingTitles.has(title)) {
                    // Need to find user ID for client.responsible
                    let responsibleId = null;
                    if (client.responsible) {
                        const { data: user } = await supabase
                            .from('users')
                            .select('id')
                            .eq('name', client.responsible)
                            .single();
                        if (user) responsibleId = user.id;
                    }

                    await supabase.from('tasks').insert({
                        title,
                        project: 'CRM Follow-Up',
                        status: 'ToDo',
                        priority: 'ALTA',
                        start_date: today,
                        due_date: today,
                        responsible_id: responsibleId,
                        objectives: []
                    });
                }
            }
        } catch (e) {
            console.error('Error creating follow-up tasks:', e);
        }
    };

    const addBusinessDays = (date: Date, days: number): Date => {
        let result = new Date(date);
        let added = 0;
        while (added < days) {
            result.setDate(result.getDate() + 1);
            const day = result.getDay();
            if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
                added++;
            }
        }
        return result;
    };

    const createClient = async (client: Omit<Client, 'id'>) => {
        try {
            let responsible_id = null;

            if (client.responsible) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id')
                    .eq('name', client.responsible)
                    .single();

                responsible_id = users?.id;
            }

            const nextFollowUp = client.nextFollowUpDate || addBusinessDays(new Date(), 3).toISOString().split('T')[0];

            const { data, error: insertError } = await supabase
                .from('clients')
                .insert({
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    company_phone: client.companyPhone,
                    company_name: client.companyName,
                    nuit: client.nuit,
                    business_value: client.businessValue,
                    next_follow_up_date: nextFollowUp,
                    internal_contact: client.internalContact,
                    internal_contact_phone: client.internalContactPhone,
                    internal_contact_role: client.internalContactRole,
                    client_responsible_name: client.clientResponsibleName,
                    client_responsible_phone: client.clientResponsiblePhone,
                    status: client.status,
                    responsible_id,
                    services: client.services || [],
                    location: client.location,
                    provenance: client.provenance,
                    last_activity: client.lastActivity
                })
                .select()
                .single();

            if (insertError) throw insertError;

            await fetchClients();
            return data;
        } catch (err: any) {
            console.error('Error creating client:', err);
            throw err;
        }
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        try {
            let responsible_id = undefined;

            if (updates.responsible !== undefined) {
                if (updates.responsible === '') {
                    responsible_id = null;
                } else {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id')
                        .eq('name', updates.responsible)
                        .single();

                    responsible_id = users?.id || null;
                }
            }

            // Fetch current client status/value for conversion trigger
            const { data: currentClient } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            const isConverting = updates.status === 'Convertido' && currentClient && currentClient.status !== 'Convertido';

            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    ...(updates.name && { name: updates.name }),
                    ...(updates.email && { email: updates.email }),
                    ...(updates.phone !== undefined && { phone: updates.phone }),
                    ...(updates.companyPhone !== undefined && { company_phone: updates.companyPhone }),
                    ...(updates.companyName !== undefined && { company_name: updates.companyName }),
                    ...(updates.nuit !== undefined && { nuit: updates.nuit }),
                    ...(updates.businessValue !== undefined && { business_value: updates.businessValue }),
                    ...(updates.nextFollowUpDate !== undefined && { next_follow_up_date: updates.nextFollowUpDate }),
                    ...(updates.internalContact !== undefined && { internal_contact: updates.internalContact }),
                    ...(updates.internalContactPhone !== undefined && { internal_contact_phone: updates.internalContactPhone }),
                    ...(updates.internalContactRole !== undefined && { internal_contact_role: updates.internalContactRole }),
                    ...(updates.clientResponsibleName !== undefined && { client_responsible_name: updates.clientResponsibleName }),
                    ...(updates.clientResponsiblePhone !== undefined && { client_responsible_phone: updates.clientResponsiblePhone }),
                    ...(updates.status && { status: updates.status }),
                    ...(responsible_id !== undefined && { responsible_id }),
                    ...(updates.services && { services: updates.services }),
                    ...(updates.location !== undefined && { location: updates.location }),
                    ...(updates.provenance !== undefined && { provenance: updates.provenance }),
                    ...(updates.lastActivity !== undefined && { last_activity: updates.lastActivity })
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Trigger conversion actions
            if (isConverting && currentClient) {
                const value = updates.businessValue !== undefined ? updates.businessValue : (currentClient.business_value ? parseFloat(currentClient.business_value) : 0);
                
                if (value > 0) {
                    // 1. Insert into transactions
                    await supabase.from('transactions').insert({
                        description: `Conversão de Lead - ${currentClient.name}`,
                        date: new Date().toISOString().split('T')[0],
                        category: 'Venda CRM',
                        value: value,
                        type: 'income',
                        status: 'Recebido'
                    });
                }

                // 2. Notify all managers
                const { data: managers } = await supabase
                    .from('users')
                    .select('id')
                    .in('role', ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading']);
                
                if (managers && managers.length > 0) {
                    const notifications = managers.map(m => ({
                        user_id: m.id,
                        type: 'lead_converted',
                        title: `Lead Convertido: ${currentClient.name}`,
                        description: `O lead foi convertido com sucesso e gerou uma receita de MT ${value.toLocaleString('pt-MZ')}.`
                    }));
                    await supabase.from('notifications').insert(notifications as any);
                }
            }

            await fetchClients();
        } catch (err: any) {
            console.error('Error updating client:', err);
            throw err;
        }
    };

    const deleteClient = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            await fetchClients();
        } catch (err: any) {
            console.error('Error deleting client:', err);
            throw err;
        }
    };

    return {
        clients,
        loading,
        error,
        createClient,
        updateClient,
        deleteClient,
        refetch: fetchClients
    };
};
