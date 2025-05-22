import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bill } from '@/types/finance';

export const useBillActions = (bills: Bill[], setBills: (bills: Bill[]) => void) => {
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
        status: data.status as Bill['status'],
        isRecurring: data.is_recurring,
        recurrenceType: data.recurrence_type as Bill['recurrenceType'],
        recurrenceEndDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : null,
        isInstallment: data.is_installment,
        totalInstallments: data.total_installments,
        currentInstallment: data.current_installment,
        parentBillId: data.parent_bill_id,
      };

      setBills([...bills, newBill]);
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
        // It's a parent installment, we need to delete all children first
        // Get all child installments
        const childBills = bills.filter(b => b.parentBillId === id);
        
        // Delete children one by one to avoid foreign key constraint errors
        for (const child of childBills) {
          const { error: childError } = await supabase
            .from('bills')
            .delete()
            .eq('id', child.id);
            
          if (childError) throw childError;
        }
        
        // Then delete the parent after all children are deleted
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

      // Update the local state to remove the deleted bills
      if (billToDelete?.isInstallment && !billToDelete.parentBillId) {
        // If it was a parent bill, remove it and all children
        setBills(bills.filter(b => b.id !== id && b.parentBillId !== id));
      } else {
        // Otherwise just remove the individual bill
        setBills(bills.filter(b => b.id !== id));
      }
      
      toast.success('Conta a pagar excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Erro ao excluir conta a pagar');
    }
  };

  return {
    addBill,
    editBill,
    deleteBill
  };
};
