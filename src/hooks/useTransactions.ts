
import { useState, useEffect } from 'react';
import { useTransactionData } from './transactions/useTransactionData';
import { useTransactionActions } from './transactions/useTransactionActions';

export const useTransactions = () => {
  const { 
    transactions, 
    accounts, 
    loading, 
    refresh 
  } = useTransactionData();
  
  const { 
    isDeleting, 
    deleteTransaction: deleteTransactionAction 
  } = useTransactionActions(accounts);
  
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);

  // Update local transactions whenever the transactions prop changes
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Handle immediate UI update when deleting a transaction
  const deleteTransaction = async (transaction: any) => {
    // Immediately remove transaction from UI
    setLocalTransactions(prev => prev.filter(t => t.id !== transaction.id));
    
    // Then perform the actual deletion in the background
    const success = await deleteTransactionAction(transaction);
    
    // If deletion failed, restore the transaction in UI
    if (!success) {
      setLocalTransactions(transactions);
    }
  };

  return {
    transactions: localTransactions,
    accounts,
    loading,
    isDeleting,
    deleteTransaction,
    refresh
  };
};
