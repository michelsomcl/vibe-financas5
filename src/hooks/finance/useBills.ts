
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bill, BillStatus, RecurrenceType } from '@/types/finance';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useBillsData = (accounts: any[], transactions: any[], setTransactions: Function, setAccounts: Function) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        
        // Fetch bills
        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select('*');
        
        if (billsError) throw billsError;

        // Format bills
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
        setLoading(false);
      }
    };

    fetchBills();
    enableRealtimeForTable('bills');

    // Set up real-time subscription for bills
    const channel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        () => {
          fetchBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          type: trans.type as any,
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

  return {
    bills,
    loading,
    addBill,
    editBill,
    deleteBill,
    payBill
  };
};
