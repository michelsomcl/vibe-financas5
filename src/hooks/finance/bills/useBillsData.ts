
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bill } from '@/types/finance';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useBillsData = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  return {
    bills,
    setBills,
    loading,
    fetchBills
  };
};
