import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TradingTrade } from '../../types';

export const useTrading = () => {
    const [trades, setTrades] = useState<TradingTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) fetchTrades();
            else setLoading(false);
        };
        init();
        const sub = supabase.channel('trading_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_trades' }, () => { if (mounted) fetchTrades(); })
            .subscribe();
        return () => { mounted = false; sub.unsubscribe(); };
    }, []);

    const fetchTrades = async () => {
        try {
            const { data, error: err } = await supabase
                .from('trading_trades')
                .select('*')
                .order('open_date', { ascending: false });
            if (err) throw err;
            setTrades((data || []).map((t: any): TradingTrade => ({
                id: t.id,
                asset: t.asset,
                lot: parseFloat(t.lot),
                stop_loss_usd: parseFloat(t.stop_loss_usd),
                take_profit_usd: parseFloat(t.take_profit_usd),
                open_date: t.open_date,
                close_date: t.close_date,
                pre_trade_notes: t.pre_trade_notes,
                result: t.result,
                realized_usd: t.realized_usd ? parseFloat(t.realized_usd) : undefined,
                observation: t.observation,
                classification: t.classification,
                exchange_rate: parseFloat(t.exchange_rate),
                created_by: t.created_by,
                created_at: t.created_at,
            })));
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const createTrade = async (trade: Omit<TradingTrade, 'id' | 'created_at'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error: err } = await supabase
            .from('trading_trades')
            .insert({ ...trade, created_by: user?.id })
            .select()
            .single();
        if (err) throw err;
        await fetchTrades();
        return data;
    };

    const updateTrade = async (id: string, updates: Partial<TradingTrade>) => {
        const { error: err } = await supabase.from('trading_trades').update(updates).eq('id', id);
        if (err) throw err;
        await fetchTrades();
    };

    const deleteTrade = async (id: string) => {
        const { error: err } = await supabase.from('trading_trades').delete().eq('id', id);
        if (err) throw err;
        await fetchTrades();
    };

    // Computed Metrics
    const closedTrades = trades.filter(t => t.result);
    const winners = closedTrades.filter(t => t.result === 'positivo');
    const losers = closedTrades.filter(t => t.result === 'negativo');
    const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0;
    const totalProfitUsd = winners.reduce((s, t) => s + (t.realized_usd || 0), 0);
    const totalLossUsd = losers.reduce((s, t) => s + Math.abs(t.realized_usd || 0), 0);
    const profitFactor = totalLossUsd > 0 ? totalProfitUsd / totalLossUsd : totalProfitUsd > 0 ? Infinity : 0;
    const avgWin = winners.length > 0 ? totalProfitUsd / winners.length : 0;
    const avgLoss = losers.length > 0 ? totalLossUsd / losers.length : 0;
    const expectancy = closedTrades.length > 0 ? (winRate / 100) * avgWin - ((1 - winRate / 100) * avgLoss) : 0;
    const disciplineRate = closedTrades.length > 0 ? (closedTrades.filter(t => t.classification === 'dentro do plano').length / closedTrades.length) * 100 : 0;

    return { trades, loading, error, createTrade, updateTrade, deleteTrade, refetch: fetchTrades, metrics: { winRate, profitFactor, expectancy, disciplineRate, totalProfitUsd, totalLossUsd, winners: winners.length, losers: losers.length, closedTrades: closedTrades.length } };
};
