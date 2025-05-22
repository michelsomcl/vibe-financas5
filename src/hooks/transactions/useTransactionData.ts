
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

/**
 * Custom hook to fetch and manage transactions and accounts data with realtime updates
 */
export const useTransactionData = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchTransactions = async () => {
    try {
      const { data } = await supabase.from('transactions').select('*');
      if (data) {
        const formattedTransactions = data.map((trans) => ({
          id: trans.id,
          type: trans.type,
          amount: Number(trans.amount),
          date: new Date(trans.date),
          categoryId: trans.category_id,
          accountId: trans.account_id,
          description: trans.description,
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao carregar as transações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await supabase.from('accounts').select('*');
      if (data) {
        const formattedAccounts = data.map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type,
        }));
        setAccounts(formattedAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // Initial data fetching
  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  // Set up realtime listeners
  useSupabaseRealtime({
    tables: ['transactions', 'accounts', 'bills'],
    onTablesChange: async (tableName) => {
      if (tableName === 'transactions') {
        await fetchTransactions();
      } else if (tableName === 'accounts') {
        await fetchAccounts();
      }
    }
  });

  return {
    transactions,
    accounts,
    loading,
    refresh: fetchTransactions,
    refreshAccounts: fetchAccounts
  };
};
