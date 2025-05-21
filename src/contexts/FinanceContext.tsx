
import { createContext, useContext, useState, ReactNode } from 'react';
import { FinanceContextType, Account, Category, Transaction, Bill } from '@/types/finance';
import { useTransactionsData } from '@/hooks/finance/useTransactions';
import { useCategoriesData } from '@/hooks/finance/useCategories';
import { useAccountsData } from '@/hooks/finance/useAccounts';
import { useBillsData } from '@/hooks/finance/useBills';
import { enableRealtimeForAllTables } from '@/integrations/supabase/realtimeHelper';

// Create the Finance context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  // Initialize all hooks to manage different aspects of finances
  const {
    categories,
    loading: categoriesLoading,
    addCategory,
    editCategory,
    deleteCategory,
    getCategoryById
  } = useCategoriesData();

  const {
    accounts,
    loading: accountsLoading,
    addAccount,
    editAccount,
    deleteAccount,
    getAccountById
  } = useAccountsData();

  const {
    transactions,
    loading: transactionsLoading,
    addTransaction,
    editTransaction,
    deleteTransaction
  } = useTransactionsData();

  // State setters for bills hook dependencies
  const [transactionsState, setTransactionsState] = useState<Transaction[]>([]);
  const [accountsState, setAccountsState] = useState<Account[]>([]);

  // Update state when data changes
  useState(() => {
    setTransactionsState(transactions);
    setAccountsState(accounts);
  });

  const {
    bills,
    loading: billsLoading,
    addBill,
    editBill,
    deleteBill,
    payBill
  } = useBillsData(accounts, transactions, setTransactionsState, setAccountsState);

  // Enable realtime for all tables on component mount
  useState(() => {
    enableRealtimeForAllTables();
  });

  // Determine overall loading state
  const loading = categoriesLoading || accountsLoading || transactionsLoading;

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        bills,
        loading,
        billsLoading,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addCategory,
        editCategory,
        deleteCategory,
        addAccount,
        editAccount,
        deleteAccount,
        getCategoryById,
        getAccountById,
        addBill,
        editBill,
        deleteBill,
        payBill,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
