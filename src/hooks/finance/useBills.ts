
import { useState } from 'react';
import { useBillsData as useRawBillsData } from './bills/useBillsData';
import { useBillActions } from './bills/useBillActions';
import { useBillPayment } from './bills/useBillPayment';
import { Account, Transaction } from '@/types/finance';

export const useBillsData = (
  accounts: Account[], 
  transactions: Transaction[], 
  setTransactions: (transactions: Transaction[]) => void, 
  setAccounts: (accounts: Account[]) => void
) => {
  // Get bills data and actions
  const { bills, setBills, loading, fetchBills } = useRawBillsData();
  const { addBill, editBill, deleteBill } = useBillActions(bills, setBills);
  const { payBill } = useBillPayment(
    bills,
    accounts,
    setBills,
    setAccounts,
    setTransactions
  );

  return {
    bills,
    loading,
    addBill,
    editBill,
    deleteBill,
    payBill,
    refresh: fetchBills
  };
};

// Export the original hook with the same interface for backward compatibility
export { useBillsData as useBills };
