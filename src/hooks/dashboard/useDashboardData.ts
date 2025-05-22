
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

/**
 * Custom hook to fetch and manage dashboard data with realtime updates
 */
export const useDashboardData = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to refresh all data
  const refreshData = useCallback(async (tableName?: string) => {
    console.log(`Refreshing dashboard data${tableName ? ` for table: ${tableName}` : ''}...`);
    
    // Fetch latest accounts data
    if (!tableName || tableName === 'accounts') {
      const { data: accountsData } = await supabase.from('accounts').select('*');
      if (accountsData) {
        const formattedAccounts = accountsData.map(acc => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type,
        }));
        setAccounts(formattedAccounts);
      }
    }
    
    // Fetch latest transactions data
    if (!tableName || tableName === 'transactions') {
      const { data: transactionsData } = await supabase.from('transactions').select('*');
      if (transactionsData) {
        const formattedTransactions = transactionsData.map((trans) => ({
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
    }
    
    // Fetch latest bills data
    if (!tableName || tableName === 'bills') {
      const { data: billsData } = await supabase.from('bills').select('*, categories(name, icon)');
      if (billsData) {
        setBills(billsData);
      }
    }
    
    if (loading) {
      setLoading(false);
    }
    
    console.log("Dashboard data refreshed successfully");
  }, [loading]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up realtime listeners for all tables
  useSupabaseRealtime({
    tables: ['accounts', 'transactions', 'bills'],
    onTablesChange: (tableName) => refreshData(tableName)
  });

  return {
    transactions,
    accounts,
    bills,
    loading,
    refreshData
  };
};
