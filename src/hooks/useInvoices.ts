import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Invoice, CompanyProfile, InvoiceItem } from '../../types';

export const useInvoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    client:clients(name),
                    issuer:users(name)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedInvoices: Invoice[] = (data || []).map((inv: any) => ({
                id: inv.id,
                codigo: inv.codigo,
                client_id: inv.client_id,
                client_name: inv.client?.name || 'Cliente Desconhecido',
                emitido_por: inv.emitido_por,
                emitido_por_nome: inv.issuer?.name || 'Utilizador Desconhecido',
                data_emissao: inv.data_emissao,
                subtotal: parseFloat(inv.subtotal),
                iva: parseFloat(inv.iva),
                total: parseFloat(inv.total),
                estado: inv.estado,
                pdf_url: inv.pdf_url,
                forma_pagamento: inv.forma_pagamento,
                validade_dias: inv.validade_dias,
                created_at: inv.created_at
            }));

            setInvoices(transformedInvoices);
        } catch (err: any) {
            console.error('Error fetching invoices:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCompanyProfile = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('company_profile')
                .select('*')
                .limit(1)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (data) {
                setCompanyProfile(data as CompanyProfile);
            }
        } catch (err: any) {
            console.error('Error fetching company profile:', err);
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                await Promise.all([fetchInvoices(), fetchCompanyProfile()]);
            } else {
                setLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [fetchInvoices, fetchCompanyProfile]);

    const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'codigo' | 'created_at' | 'estado'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) => {
        try {
            // 1. Generate code via RPC
            const { data: codigo, error: rpcError } = await supabase.rpc('gerar_codigo_factura');
            if (rpcError) throw rpcError;

            // 2. Insert Invoice
            const { data: newInvoice, error: insertError } = await supabase
                .from('invoices')
                .insert({
                    codigo,
                    client_id: invoiceData.client_id,
                    emitido_por: invoiceData.emitido_por,
                    subtotal: invoiceData.subtotal,
                    iva: invoiceData.iva,
                    total: invoiceData.total,
                    forma_pagamento: invoiceData.forma_pagamento,
                    validade_dias: invoiceData.validade_dias
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 3. Insert Items
            if (items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    invoice_id: newInvoice.id,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    total_linha: item.total_linha
                }));

                const { error: itemsError } = await supabase
                    .from('invoice_items')
                    .insert(itemsToInsert);
                
                if (itemsError) throw itemsError;
            }

            await fetchInvoices();
            return newInvoice as Invoice;
        } catch (err: any) {
            console.error('Error creating invoice:', err);
            throw err;
        }
    };

    const updateInvoiceUrl = async (id: string, url: string) => {
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ pdf_url: url })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchInvoices();
        } catch (err: any) {
            console.error('Error updating invoice URL:', err);
            throw err;
        }
    };

    const cancelInvoice = async (id: string) => {
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ estado: 'anulada' })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchInvoices();
        } catch (err: any) {
            console.error('Error cancelling invoice:', err);
            throw err;
        }
    };

    const updateInvoiceStatus = async (id: string, estado: 'emitida' | 'paga' | 'anulada') => {
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ estado })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchInvoices();
        } catch (err: any) {
            console.error('Error updating invoice status:', err);
            throw err;
        }
    };

    return {
        invoices,
        companyProfile,
        loading,
        error,
        createInvoice,
        updateInvoiceUrl,
        cancelInvoice,
        updateInvoiceStatus,
        refetch: fetchInvoices
    };
};
