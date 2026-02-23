import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../../types';

export const useTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                fetchTransactions();
            } else {
                setLoading(false);
            }
        };

        init();

        const subscription = supabase
            .channel('transactions_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions'
            }, () => {
                if (mounted) fetchTransactions();
            })
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedTransactions: Transaction[] = (data || []).map((transaction: any) => ({
                id: transaction.id,
                desc: transaction.description,
                date: transaction.date,
                cat: transaction.category,
                val: parseFloat(transaction.value),
                type: transaction.type,
                status: transaction.status
            }));

            setTransactions(transformedTransactions);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching transactions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        try {
            const { data, error: insertError } = await supabase
                .from('transactions')
                .insert({
                    description: transaction.desc,
                    date: transaction.date,
                    category: transaction.cat,
                    value: transaction.val,
                    type: transaction.type,
                    status: transaction.status
                })
                .select()
                .single();

            if (insertError) throw insertError;

            await fetchTransactions();
            return data;
        } catch (err: any) {
            console.error('Error creating transaction:', err);
            throw err;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        try {
            const { error: updateError } = await supabase
                .from('transactions')
                .update({
                    ...(updates.desc && { description: updates.desc }),
                    ...(updates.date && { date: updates.date }),
                    ...(updates.cat && { category: updates.cat }),
                    ...(updates.val !== undefined && { value: updates.val }),
                    ...(updates.type && { type: updates.type }),
                    ...(updates.status && { status: updates.status })
                })
                .eq('id', id);

            if (updateError) throw updateError;

            await fetchTransactions();
        } catch (err: any) {
            console.error('Error updating transaction:', err);
            throw err;
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            await fetchTransactions();
        } catch (err: any) {
            console.error('Error deleting transaction:', err);
            throw err;
        }
    };

    return {
        transactions,
        loading,
        error,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        refetch: fetchTransactions
    };
};
