
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Custom hook to handle transaction operations
 */
export const useTransactionActions = (accounts: any[]) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir a transação.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deleteTransaction
  };
};
