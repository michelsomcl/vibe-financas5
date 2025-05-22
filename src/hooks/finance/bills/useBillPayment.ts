
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bill, Account, Transaction } from '@/types/finance';

export const useBillPayment = (
  bills: Bill[], 
  accounts: Account[], 
  setBills: (bills: Bill[]) => void,
  setAccounts: (accounts: Account[]) => void,
  setTransactions: (transactions: Transaction[]) => void
) => {
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
          type: trans.type as Transaction['type'],
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
          status: bill.status as Bill['status'],
          isRecurring: bill.is_recurring,
          recurrenceType: bill.recurrence_type as Bill['recurrenceType'],
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

  return { payBill };
};
