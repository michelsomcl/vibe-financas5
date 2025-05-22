
import { useFinance } from '@/contexts/FinanceContext';
import { useDashboardData } from './dashboard/useDashboardData';
import { useDashboardSummary } from './dashboard/useDashboardSummary';
import { useBillsSummary } from './dashboard/useBillsSummary';
import { useEffect } from 'react';

export const useDashboard = () => {
  const { categories, loading: categoriesLoading, billsLoading } = useFinance();
  
  const { 
    transactions, 
    accounts, 
    bills, 
    loading: dataLoading, 
    refreshData 
  } = useDashboardData();
  
  const { 
    totalIncome, 
    totalExpense, 
    totalBalance, 
    categoryData, 
    monthlyData 
  } = useDashboardSummary(transactions, categories, accounts);
  
  const { 
    upcomingBills, 
    overdueBills, 
    todayBills 
  } = useBillsSummary(bills);

  return {
    // Summary data
    totalIncome,
    totalExpense,
    totalBalance,
    categoryData,
    monthlyData,
    
    // Bills data
    upcomingBills,
    overdueBills,
    todayBills,
    
    // Raw data
    localTransactions: transactions,
    categories,
    
    // Loading states
    loading: dataLoading || categoriesLoading,
    billsLoading,
    
    // Actions
    refreshData
  };
};
