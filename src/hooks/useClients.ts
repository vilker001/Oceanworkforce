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
        } catch (err: any) {
            console.error('Error fetching clients:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
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

            const { data, error: insertError } = await supabase
                .from('clients')
                .insert({
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    company_phone: client.companyPhone,
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

            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    ...(updates.name && { name: updates.name }),
                    ...(updates.email && { email: updates.email }),
                    ...(updates.phone !== undefined && { phone: updates.phone }),
                    ...(updates.companyPhone !== undefined && { company_phone: updates.companyPhone }),
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
