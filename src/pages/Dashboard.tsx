
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useDashboard } from '@/hooks/useDashboard';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { BillsCards } from '@/components/dashboard/BillsCards';
import { ExpensesChart } from '@/components/dashboard/ExpensesChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useEffect } from 'react';

const Dashboard = () => {
  const {
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
    billsLoading,
    refreshData
  } = useDashboard();

  // Initial refresh of data when dashboard loads
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (loading || billsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Visão Geral" description="Acompanhe suas finanças em um só lugar" />
      
      <SummaryCards 
        totalBalance={totalBalance} 
        totalIncome={totalIncome} 
        totalExpense={totalExpense} 
      />

      <BillsCards 
        overdueBills={overdueBills} 
        todayBills={todayBills} 
        upcomingBills={upcomingBills} 
        categories={categories} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpensesChart categoryData={categoryData} />
        <MonthlyChart monthlyData={monthlyData} />
      </div>

      <RecentTransactions 
        transactions={localTransactions} 
        categories={categories} 
      />
    </div>
  );
};

export default Dashboard;
