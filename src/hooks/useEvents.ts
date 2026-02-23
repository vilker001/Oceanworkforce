import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent, EventType } from '../../types';

export const useEvents = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                fetchEvents();
            } else {
                setLoading(false);
            }
        };

        init();

        const subscription = supabase
            .channel('events_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'calendar_events'
            }, () => {
                if (mounted) fetchEvents();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('calendar_events')
                .select('*, creator:users(name)')
                .order('date', { ascending: true });

            if (fetchError) throw fetchError;

            const transformedEvents: CalendarEvent[] = (data || []).map((event: any) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                type: event.type as EventType,
                description: event.description,
                creatorName: event.creator?.name || 'Sistema'
            }));

            setEvents(transformedEvents);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createEvent = async (event: Omit<CalendarEvent, 'id'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error: insertError } = await supabase
                .from('calendar_events')
                .insert({
                    title: event.title,
                    date: event.date,
                    type: event.type,
                    description: event.description,
                    created_by: user?.id
                })
                .select()
                .single();

            if (insertError) throw insertError;

            await fetchEvents();
            return data;
        } catch (err: any) {
            console.error('Error creating event:', err);
            throw err;
        }
    };

    const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
        try {
            const { error: updateError } = await supabase
                .from('calendar_events')
                .update({
                    ...(updates.title && { title: updates.title }),
                    ...(updates.date && { date: updates.date }),
                    ...(updates.type && { type: updates.type }),
                    ...(updates.description !== undefined && { description: updates.description })
                })
                .eq('id', id);

            if (updateError) throw updateError;

            await fetchEvents();
        } catch (err: any) {
            console.error('Error updating event:', err);
            throw err;
        }
    };

    const deleteEvent = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            await fetchEvents();
        } catch (err: any) {
            console.error('Error deleting event:', err);
            throw err;
        }
    };

    return {
        events,
        loading,
        error,
        createEvent,
        updateEvent,
        deleteEvent,
        refetch: fetchEvents
    };
};
