
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Transaction, TransactionType } from '@/types/finance';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useTransactionsData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*');
        
        if (transactionsError) throw transactionsError;

        // Format transactions
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
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Erro ao carregar transações');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    enableRealtimeForTable('transactions');

    // Set up real-time subscription for transactions
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      
      // Update bill status if this transaction was from a bill payment
      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('status', 'paid')
        .ilike('description', `%${transaction.description.replace('Pagamento: ', '')}%`);
        
      if (billsData && billsData.length > 0) {
        // Update the bill status back to pending
        await supabase
          .from('bills')
          .update({ status: 'pending' })
          .eq('id', billsData[0].id);
      }
      
      // Delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state for transactions
      setTransactions(transactions.filter((t) => t.id !== id));
      
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    editTransaction,
    deleteTransaction
  };
};
