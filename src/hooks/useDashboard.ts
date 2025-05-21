
import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { enableRealtimeForAllTables } from '@/integrations/supabase/realtimeHelper';
import { format, isSameMonth, isAfter, isBefore, startOfToday } from 'date-fns';

export const useDashboard = () => {
  const { transactions, categories, accounts, bills, loading, billsLoading } = useFinance();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [todayBills, setTodayBills] = useState<any[]>([]);
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);
  const [localAccounts, setLocalAccounts] = useState<any[]>([]);
  const [localBills, setLocalBills] = useState<any[]>([]);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);
  
  useEffect(() => {
    setLocalBills(bills);
  }, [bills]);

  // Enable real-time updates for all tables
  useEffect(() => {
    // Enable realtime for all tables
    const initializeRealtime = async () => {
      await enableRealtimeForAllTables();
    };
    
    initializeRealtime();
    
    // Set up listeners for all relevant tables
    const accountsChannel = supabase
      .channel('dashboard-accounts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        async () => {
          // Refresh accounts data
          const { data } = await supabase.from('accounts').select('*');
          if (data) {
            const formattedAccounts = data.map(acc => ({
              id: acc.id,
              name: acc.name,
              balance: Number(acc.balance),
              type: acc.type,
            }));
            setLocalAccounts(formattedAccounts);
          }
        }
      )
      .subscribe();
      
    const transactionsChannel = supabase
      .channel('dashboard-transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async () => {
          // Refresh transactions data
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
            setLocalTransactions(formattedTransactions);
          }
        }
      )
      .subscribe();
      
    const billsChannel = supabase
      .channel('dashboard-bills-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        async () => {
          // Refresh bills data
          const { data } = await supabase.from('bills').select('*, categories(name, icon)');
          if (data) {
            setLocalBills(data);
          }
        }
      )
      .subscribe();

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(billsChannel);
    };
  }, []);

  useEffect(() => {
    // Calculate totals
    const income = localTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = localTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    setTotalIncome(income);
    setTotalExpense(expense);
    
    // Calculate total balance from all accounts
    const balance = localAccounts.reduce((acc, account) => acc + account.balance, 0);
    setTotalBalance(balance);

    // Prepare category data for pie chart
    const expensesByCategory = localTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const category = categories.find(c => c.id === transaction.categoryId);
        if (category) {
          acc[category.name] = (acc[category.name] || 0) + transaction.amount;
        }
        return acc;
      }, {} as Record<string, number>);

    const categoryPieData = Object.entries(expensesByCategory).map(([name, value]) => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        value,
        icon: category?.icon || '🔹',
      };
    });
    
    setCategoryData(categoryPieData);

    // Prepare monthly data for line chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTransactions = localTransactions.filter(t => 
      new Date(t.date) >= sixMonthsAgo
    );

    const monthlyGrouped = monthlyTransactions.reduce((acc, transaction) => {
      const month = format(new Date(transaction.date), 'MMM');
      
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 };
      }
      
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expense += transaction.amount;
      }
      
      return acc;
    }, {} as Record<string, { month: string; income: number; expense: number }>);
    
    setMonthlyData(Object.values(monthlyGrouped));

    // Filter bills for dashboard cards
    const today = startOfToday();
    
    // Upcoming bills (due in the next 7 days but not overdue)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcoming = localBills
      .filter(b => 
        b.status === 'pending' &&
        isAfter(new Date(b.due_date), today) && 
        isBefore(new Date(b.due_date), sevenDaysFromNow)
      )
      .slice(0, 3);
    setUpcomingBills(upcoming);
    
    // Overdue bills
    const overdue = localBills
      .filter(b => 
        b.status === 'pending' && 
        isBefore(new Date(b.due_date), today)
      )
      .slice(0, 3);
    setOverdueBills(overdue);
    
    // Today's bills
    const due = localBills
      .filter(b => {
        const billDate = new Date(b.due_date);
        return b.status === 'pending' && 
          billDate.getDate() === today.getDate() &&
          billDate.getMonth() === today.getMonth() &&
          billDate.getFullYear() === today.getFullYear();
      })
      .slice(0, 3);
    setTodayBills(due);

  }, [localTransactions, localAccounts, categories, localBills]);

  return {
    totalIncome,
    totalExpense,
    categoryData,
    monthlyData,
    totalBalance,
    upcomingBills,
    overdueBills,
    todayBills,
    localTransactions,
    categories,
    loading,
    billsLoading
  };
};
