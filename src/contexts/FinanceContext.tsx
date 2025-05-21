import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Types
export type TransactionType = 'income' | 'expense';
export type BillStatus = 'pending' | 'paid' | 'cancelled';
export type RecurrenceType = 'monthly' | 'weekly' | 'yearly' | null;

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'cash' | 'credit' | 'investment';
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  categoryId: string;
  accountId: string;
  description: string;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  categoryId: string;
  status: BillStatus;
  isRecurring: boolean;
  recurrenceType: RecurrenceType;
  recurrenceEndDate: Date | null;
  isInstallment: boolean;
  totalInstallments: number | null;
  currentInstallment: number | null;
  parentBillId: string | null;
}

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  bills: Bill[];
  loading: boolean;
  billsLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  editCategory: (id: string, category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  editAccount: (id: string, account: Omit<Account, 'id'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  addBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  editBill: (id: string, bill: Omit<Bill, 'id'>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  payBill: (billId: string, accountId: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');
        
        if (categoriesError) throw categoriesError;
        
        // Fetch accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*');
        
        if (accountsError) throw accountsError;
        
        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*');
        
        if (transactionsError) throw transactionsError;

        // Transform data to match our interfaces
        const formattedCategories = categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type as TransactionType,
          icon: cat.icon,
          color: cat.color,
        }));

        const formattedAccounts = accountsData.map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type as 'bank' | 'cash' | 'credit' | 'investment',
        }));

        const formattedTransactions = transactionsData.map((trans) => ({
          id: trans.id,
          type: trans.type as TransactionType,
          amount: Number(trans.amount),
          date: new Date(trans.date),
          categoryId: trans.category_id,
          accountId: trans.account_id,
          description: trans.description,
        }));

        setCategories(formattedCategories);
        setAccounts(formattedAccounts);
        setTransactions(formattedTransactions);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch bills data
  useEffect(() => {
    const fetchBills = async () => {
      setBillsLoading(true);
      try {
        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select('*');
        
        if (billsError) throw billsError;
        
        const formattedBills = billsData.map((bill) => ({
          id: bill.id,
          description: bill.description,
          amount: Number(bill.amount),
          dueDate: new Date(bill.due_date),
          categoryId: bill.category_id,
          status: bill.status as BillStatus,
          isRecurring: bill.is_recurring,
          recurrenceType: bill.recurrence_type as RecurrenceType,
          recurrenceEndDate: bill.recurrence_end_date ? new Date(bill.recurrence_end_date) : null,
          isInstallment: bill.is_installment,
          totalInstallments: bill.total_installments,
          currentInstallment: bill.current_installment,
          parentBillId: bill.parent_bill_id,
        }));

        setBills(formattedBills);
      } catch (error) {
        console.error('Error fetching bills:', error);
        toast.error('Erro ao carregar contas a pagar');
      } finally {
        setBillsLoading(false);
      }
    };

    fetchBills();
  }, []);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          type: transaction.type,
          amount: transaction.amount,
          date: transaction.date.toISOString(),
          category_id: transaction.categoryId,
          account_id: transaction.accountId,
          description: transaction.description,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction = {
        id: data.id,
        type: data.type as TransactionType,
        amount: Number(data.amount),
        date: new Date(data.date),
        categoryId: data.category_id,
        accountId: data.account_id,
        description: data.description,
      };

      setTransactions([...transactions, newTransaction]);
      toast.success('Transação adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Erro ao adicionar transação');
    }
  };

  const editTransaction = async (id: string, transaction: Omit<Transaction, 'id'>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: transaction.type,
          amount: transaction.amount,
          date: transaction.date.toISOString(),
          category_id: transaction.categoryId,
          account_id: transaction.accountId,
          description: transaction.description,
        })
        .eq('id', id);

      if (error) throw error;

      setTransactions(
        transactions.map((t) => (t.id === id ? { ...transaction, id } : t))
      );
      toast.success('Transação atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Erro ao atualizar transação');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // First get the transaction that will be deleted to adjust account balance
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) {
        throw new Error('Transação não encontrada');
      }
      
      // Find the affected account
      const account = accounts.find(a => a.id === transaction.accountId);
      if (!account) {
        throw new Error('Conta não encontrada');
      }
      
      // Calculate the new balance
      // For expenses, we add the amount back to the account
      // For income, we subtract the amount from the account
      const balanceChange = transaction.type === 'expense' ? transaction.amount : -transaction.amount;
      const newBalance = account.balance + balanceChange;
      
      // Update the account balance in Supabase
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', transaction.accountId);
      
      if (accountError) throw accountError;
      
      // Delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state for transactions
      setTransactions(transactions.filter((t) => t.id !== id));
      
      // Update local state for accounts
      setAccounts(accounts.map(a => 
        a.id === transaction.accountId 
          ? { ...a, balance: newBalance } 
          : a
      ));
      
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory = {
        id: data.id,
        name: data.name,
        type: data.type as TransactionType,
        icon: data.icon,
        color: data.color,
      };

      setCategories([...categories, newCategory]);
      toast.success('Categoria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria');
    }
  };

  const editCategory = async (id: string, category: Omit<Category, 'id'>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        })
        .eq('id', id);

      if (error) throw error;

      setCategories(
        categories.map((c) => (c.id === id ? { ...category, id } : c))
      );
      toast.success('Categoria atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const deleteCategory = async (id: string) => {
    // Check if any transactions use this category
    const transactionsWithCategory = transactions.filter(t => t.categoryId === id);
    
    if (transactionsWithCategory.length > 0) {
      toast.error('Não é possível excluir uma categoria que está sendo utilizada em transações.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const addAccount = async (account: Omit<Account, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: account.name,
          balance: account.balance,
          type: account.type,
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount = {
        id: data.id,
        name: data.name,
        balance: Number(data.balance),
        type: data.type as 'bank' | 'cash' | 'credit' | 'investment',
      };

      setAccounts([...accounts, newAccount]);
      toast.success('Conta adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Erro ao adicionar conta');
    }
  };

  const editAccount = async (id: string, account: Omit<Account, 'id'>) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: account.name,
          balance: account.balance,
          type: account.type,
        })
        .eq('id', id);

      if (error) throw error;

      setAccounts(
        accounts.map((a) => (a.id === id ? { ...account, id } : a))
      );
      toast.success('Conta atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Erro ao atualizar conta');
    }
  };

  const deleteAccount = async (id: string) => {
    // Check if any transactions use this account
    const transactionsWithAccount = transactions.filter(t => t.accountId === id);
    
    if (transactionsWithAccount.length > 0) {
      toast.error('Não é possível excluir uma conta que está sendo utilizada em transações.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAccounts(accounts.filter((a) => a.id !== id));
      toast.success('Conta excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getAccountById = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  const addBill = async (bill: Omit<Bill, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          description: bill.description,
          amount: bill.amount,
          due_date: bill.dueDate.toISOString(),
          category_id: bill.categoryId,
          status: bill.status,
          is_recurring: bill.isRecurring,
          recurrence_type: bill.recurrenceType,
          recurrence_end_date: bill.recurrenceEndDate ? bill.recurrenceEndDate.toISOString() : null,
          is_installment: bill.isInstallment,
          total_installments: bill.totalInstallments,
          current_installment: bill.currentInstallment,
          parent_bill_id: bill.parentBillId,
        })
        .select()
        .single();

      if (error) throw error;

      // If it's an installment bill, create all installments
      if (bill.isInstallment && bill.totalInstallments && bill.totalInstallments > 1) {
        const installmentPromises = [];
        
        // Create all installments (starting from 2, as we already created the first one)
        for (let i = 2; i <= bill.totalInstallments; i++) {
          // Calculate due date for each installment (add i-1 months to the original due date)
          const installmentDueDate = new Date(bill.dueDate);
          installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));
          
          installmentPromises.push(
            supabase.from('bills').insert({
              description: bill.description,
              amount: bill.amount,
              due_date: installmentDueDate.toISOString(),
              category_id: bill.categoryId,
              status: 'pending',
              is_installment: true,
              total_installments: bill.totalInstallments,
              current_installment: i,
              parent_bill_id: data.id,
            })
          );
        }
        
        // Wait for all installments to be created
        await Promise.all(installmentPromises);
      }

      // If it's a recurring bill, create future recurrences
      if (bill.isRecurring && bill.recurrenceType) {
        const recurrencePromises = [];
        const today = new Date();
        let nextDueDate = new Date(bill.dueDate);
        
        // Create future recurrences - generate up to 12 future occurrences or until end date
        for (let i = 0; i < 12; i++) {
          // Calculate next due date based on recurrence type
          if (bill.recurrenceType === 'monthly') {
            nextDueDate = new Date(nextDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          } else if (bill.recurrenceType === 'weekly') {
            nextDueDate = new Date(nextDueDate);
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          } else if (bill.recurrenceType === 'yearly') {
            nextDueDate = new Date(nextDueDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          }
          
          // Only create new recurrence if it's before the end date (or if there's no end date)
          if (bill.recurrenceEndDate && nextDueDate > bill.recurrenceEndDate) {
            break;
          }
          
          recurrencePromises.push(
            supabase.from('bills').insert({
              description: bill.description,
              amount: bill.amount,
              due_date: nextDueDate.toISOString(),
              category_id: bill.categoryId,
              status: 'pending',
              is_recurring: bill.isRecurring,
              recurrence_type: bill.recurrenceType,
              recurrence_end_date: bill.recurrenceEndDate ? bill.recurrenceEndDate.toISOString() : null
            })
          );
        }
        
        // Wait for all recurrences to be created
        await Promise.all(recurrencePromises);
      }

      const newBill = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        dueDate: new Date(data.due_date),
        categoryId: data.category_id,
        status: data.status as BillStatus,
        isRecurring: data.is_recurring,
        recurrenceType: data.recurrence_type as RecurrenceType,
        recurrenceEndDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : null,
        isInstallment: data.is_installment,
        totalInstallments: data.total_installments,
        currentInstallment: data.current_installment,
        parentBillId: data.parent_bill_id,
      };

      setBills([...bills, newBill]);
      
      // Refetch all bills to get installments
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*');
      
      if (billsError) throw billsError;
      
      const formattedBills = billsData.map((bill) => ({
        id: bill.id,
        description: bill.description,
        amount: Number(bill.amount),
        dueDate: new Date(bill.due_date),
        categoryId: bill.category_id,
        status: bill.status as BillStatus,
        isRecurring: bill.is_recurring,
        recurrenceType: bill.recurrence_type as RecurrenceType,
        recurrenceEndDate: bill.recurrence_end_date ? new Date(bill.recurrence_end_date) : null,
        isInstallment: bill.is_installment,
        totalInstallments: bill.total_installments,
        currentInstallment: bill.current_installment,
        parentBillId: bill.parent_bill_id,
      }));

      setBills(formattedBills);
      toast.success('Conta a pagar adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding bill:', error);
      toast.error('Erro ao adicionar conta a pagar');
    }
  };

  const editBill = async (id: string, bill: Omit<Bill, 'id'>) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          description: bill.description,
          amount: bill.amount,
          due_date: bill.dueDate.toISOString(),
          category_id: bill.categoryId,
          status: bill.status,
          is_recurring: bill.isRecurring,
          recurrence_type: bill.recurrenceType,
          recurrence_end_date: bill.recurrenceEndDate ? bill.recurrenceEndDate.toISOString() : null,
          is_installment: bill.isInstallment,
          total_installments: bill.totalInstallments,
          current_installment: bill.currentInstallment,
          parent_bill_id: bill.parentBillId,
        })
        .eq('id', id);

      if (error) throw error;

      setBills(bills.map((b) => (b.id === id ? { ...bill, id } : b)));
      toast.success('Conta a pagar atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Erro ao atualizar conta a pagar');
    }
  };

  const deleteBill = async (id: string) => {
    try {
      // Get the bill to check if it's part of an installment series
      const billToDelete = bills.find(b => b.id === id);
      
      if (billToDelete?.isInstallment && billToDelete.parentBillId) {
        // It's a child installment, just delete this one
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else if (billToDelete?.isInstallment && !billToDelete.parentBillId) {
        // It's a parent installment, delete all children too
        const { error: childError } = await supabase
          .from('bills')
          .delete()
          .eq('parent_bill_id', id);

        if (childError) throw childError;
        
        // Then delete the parent
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Regular bill, just delete it
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setBills(bills.filter((b) => b.id !== id && b.parentBillId !== id));
      toast.success('Conta a pagar excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Erro ao excluir conta a pagar');
    }
  };

  const payBill = async (billId: string, accountId: string) => {
    try {
      // Find the bill and account
      const bill = bills.find(b => b.id === billId);
      const account = accounts.find(a => a.id === accountId);
      
      if (!bill || !account) {
        toast.error('Conta a pagar ou conta bancária não encontrada');
        return;
      }

      // Update bill status to paid
      const { error: billError } = await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', billId);

      if (billError) throw billError;

      // Create a transaction for this payment
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: bill.amount,
          date: new Date().toISOString(),
          category_id: bill.categoryId,
          account_id: accountId,
          description: `Pagamento: ${bill.description}`,
        });

      if (transactionError) throw transactionError;

      // Update account balance
      const newBalance = account.balance - bill.amount;
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', accountId);

      if (accountError) throw accountError;

      // If it's a recurring bill, create the next occurrence
      if (bill.isRecurring && bill.recurrenceType) {
        const nextDueDate = new Date(bill.dueDate);
        
        // Calculate next due date based on recurrence type
        if (bill.recurrenceType === 'monthly') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } else if (bill.recurrenceType === 'weekly') {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (bill.recurrenceType === 'yearly') {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }
        
        // Only create new recurrence if it's before the end date
        if (!bill.recurrenceEndDate || nextDueDate <= bill.recurrenceEndDate) {
          await supabase.from('bills').insert({
            description: bill.description,
            amount: bill.amount,
            due_date: nextDueDate.toISOString(),
            category_id: bill.categoryId,
            status: 'pending',
            is_recurring: bill.isRecurring,
            recurrence_type: bill.recurrenceType,
            recurrence_end_date: bill.recurrenceEndDate ? bill.recurrenceEndDate.toISOString() : null
          });
        }
      }

      // Refresh data
      // Update bills list
      setBills(bills.map(b => b.id === billId ? { ...b, status: 'paid' } : b));
      
      // Update accounts list
      setAccounts(accounts.map(a => a.id === accountId ? { ...a, balance: newBalance } : a));
      
      // Fetch latest transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*');
        
      if (transactionsData) {
        const formattedTransactions = transactionsData.map((trans) => ({
          id: trans.id,
          type: trans.type as TransactionType,
          amount: Number(trans.amount),
          date: new Date(trans.date),
          categoryId: trans.category_id,
          accountId: trans.account_id,
          description: trans.description,
        }));

        setTransactions(formattedTransactions);
      }
      
      // Refetch bills to get the updated list including new recurrence
      const { data: billsData } = await supabase
        .from('bills')
        .select('*');
        
      if (billsData) {
        const formattedBills = billsData.map((bill) => ({
          id: bill.id,
          description: bill.description,
          amount: Number(bill.amount),
          dueDate: new Date(bill.due_date),
          categoryId: bill.category_id,
          status: bill.status as BillStatus,
          isRecurring: bill.is_recurring,
          recurrenceType: bill.recurrence_type as RecurrenceType,
          recurrenceEndDate: bill.recurrence_end_date ? new Date(bill.recurrence_end_date) : null,
          isInstallment: bill.is_installment,
          totalInstallments: bill.total_installments,
          currentInstallment: bill.current_installment,
          parentBillId: bill.parent_bill_id,
        }));

        setBills(formattedBills);
      }

      toast.success('Pagamento registrado com sucesso!');
    } catch (error) {
      console.error('Error paying bill:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

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
