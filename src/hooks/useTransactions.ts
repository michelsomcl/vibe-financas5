
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const deleteTransaction = async (transaction: any) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      // Find the affected account
      const account = accounts.find(a => a.id === transaction.accountId);
      if (!account) {
        throw new Error('Conta não encontrada');
      }
      
      // Calculate the new balance
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
        .eq('id', transaction.id);

      if (error) throw error;
      
      // Check if this transaction is related to a bill payment
      // If it's a payment from a bill, we need to update the bill status back to pending
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', transaction.id);
        
      if (!billError && billData && billData.length > 0) {
        // This is a transaction that was created from a bill payment
        // Update the bill status back to pending
        const { error: updateBillError } = await supabase
          .from('bills')
          .update({ status: 'pending' })
          .eq('id', transaction.id);
          
        if (updateBillError) {
          console.error('Error updating associated bill:', updateBillError);
        }
      }
      
      // Also check for any bill with a description matching this transaction
      // This handles the case where transaction description starts with "Pagamento: "
      if (transaction.description.startsWith('Pagamento: ')) {
        const billDescription = transaction.description.replace('Pagamento: ', '');
        
        // Find bills with this description that are marked as paid
        const { data: relatedBills } = await supabase
          .from('bills')
          .select('*')
          .eq('description', billDescription)
          .eq('status', 'paid');
          
        if (relatedBills && relatedBills.length > 0) {
          // Update the most recently paid bill with this description back to pending
          const mostRecentBill = relatedBills[0];
          
          const { error: updateBillError } = await supabase
            .from('bills')
            .update({ status: 'pending' })
            .eq('id', mostRecentBill.id);
            
          if (updateBillError) {
            console.error('Error updating related bill:', updateBillError);
          }
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Transação excluída com sucesso!',
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir a transação.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    
    // Setup realtime listeners
    const setupRealtimeListeners = async () => {
      console.log('Setting up realtime listeners for transactions and accounts');
      
      await enableRealtimeForTable('transactions');
      await enableRealtimeForTable('accounts');
      await enableRealtimeForTable('bills');
      
      // Transaction changes channel
      const transactionsChannel = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            console.log('Transaction change detected, refreshing data');
            fetchTransactions();
          }
        )
        .subscribe();
        
      // Accounts changes channel  
      const accountsChannel = supabase
        .channel('accounts-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts' },
          () => {
            console.log('Account change detected, refreshing data');
            fetchAccounts();
          }
        )
        .subscribe();

      // Clean up the subscriptions when component unmounts
      return () => {
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(accountsChannel);
      };
    };
    
    setupRealtimeListeners();
  }, []);

  return {
    transactions,
    accounts,
    loading,
    isDeleting,
    deleteTransaction,
    refresh: fetchTransactions
  };
};
