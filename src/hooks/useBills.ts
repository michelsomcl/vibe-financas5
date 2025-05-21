
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useBills = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, categories(name, icon)')
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching bills:', error);
        toast({
          title: 'Erro ao carregar contas',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      // Process the bills data to ensure dates are handled correctly
      const processedBills = data?.map(bill => ({
        ...bill,
        // Ensure we have the due_date in the correct format
        due_date: bill.due_date
      })) || [];

      setBills(processedBills);
    } catch (error) {
      console.error('Unexpected error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    
    // Enable real-time for the bills table
    enableRealtimeForTable('bills');

    // Set up realtime subscription
    const channel = supabase
      .channel('bills-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bills'
      }, () => {
        fetchBills();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    bills, 
    loading,
    refresh: fetchBills
  };
};
