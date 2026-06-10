import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FinancialSettings {
  id: string;
  initial_balance: number;
  currency: string;
}

export const useFinancialSettings = () => {
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data || { id: '', initial_balance: 0, currency: 'MT' });
    } catch (err) {
      console.error('Error fetching financial settings:', err);
      setSettings({ id: '', initial_balance: 0, currency: 'MT' });
    } finally {
      setLoading(false);
    }
  };

  const updateInitialBalance = async (newBalance: number) => {
    try {
      const { data: existing } = await supabase
        .from('financial_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing?.id) {
        const { error } = await supabase
          .from('financial_settings')
          .update({ initial_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_settings')
          .insert({ initial_balance: newBalance });
        if (error) throw error;
      }

      await fetchSettings();
    } catch (err: any) {
      console.error('Error updating balance:', err);
      throw err;
    }
  };

  return { settings, loading, updateInitialBalance };
};
