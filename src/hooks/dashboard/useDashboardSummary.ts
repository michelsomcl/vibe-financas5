
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  categoryId: string;
  accountId: string;
  description: string;
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

/**
 * Custom hook to calculate summary data for dashboard
 */
export const useDashboardSummary = (
  transactions: Transaction[],
  categories: Category[],
  accounts: any[]
) => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    // Calculate totals
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    setTotalIncome(income);
    setTotalExpense(expense);
    
    // Calculate total balance from all accounts
    const balance = accounts.reduce((acc, account) => acc + account.balance, 0);
    setTotalBalance(balance);

    // Prepare category data for pie chart
    const expensesByCategory = transactions
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

    const monthlyTransactions = transactions.filter(t => 
      t.date >= sixMonthsAgo
    );

    const monthlyGrouped = monthlyTransactions.reduce((acc, transaction) => {
      const month = format(transaction.date, 'MMM');
      
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
  }, [transactions, accounts, categories]);

  return {
    totalIncome,
    totalExpense,
    totalBalance,
    categoryData,
    monthlyData,
  };
};
