import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format, isBefore, isEqual, isToday } from 'date-fns';
import { enableRealtimeForAllTables } from '@/integrations/supabase/realtimeHelper';
import { useBills } from '@/hooks/useBills';

export const useBillsPage = () => {
  const { categories, billsLoading, deleteBill } = useFinance();
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { bills: localBills, refresh: refreshBills, loading: billsDataLoading } = useBills();

  // Enable real-time updates for all tables when the component mounts
  useEffect(() => {
    const initializeRealtime = async () => {
      await enableRealtimeForAllTables();
    };
    
    initializeRealtime();
  }, []);

  // Filter bills based on the active tab
  const displayBills = localBills.filter(bill => {
    if (bill.status !== 'pending') return false;
    
    // Parse the date string correctly to avoid timezone issues
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
    
    // Ensure we're working with a proper date object for the due date
    let dueDate: Date;
    if (typeof bill.due_date === 'string') {
      // Parse the date directly from the YYYY-MM-DD format without timezone conversion
      const dateParts = bill.due_date.split('-');
      dueDate = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      );
    } else {
      dueDate = new Date(bill.due_date);
    }
    
    dueDate.setHours(0, 0, 0, 0); // Set to beginning of day
    
    switch (activeTab) {
      case 'overdue':
        return isBefore(dueDate, today) && !isEqual(dueDate, today);
      case 'today':
        return isToday(dueDate);
      case 'upcoming':
        return isBefore(today, dueDate);
      default:
        return true;
    }
  });

  // Group bills by due date
  const groupedBills: Record<string, typeof displayBills> = {};
  displayBills.forEach(bill => {
    const dateKey = typeof bill.due_date === 'string' ? bill.due_date : format(new Date(bill.due_date), 'yyyy-MM-dd');
    if (!groupedBills[dateKey]) {
      groupedBills[dateKey] = [];
    }
    groupedBills[dateKey].push(bill);
  });

  // Sort dates
  const sortedDates = Object.keys(groupedBills).sort();

  const handlePayBill = (billId: string) => {
    setSelectedBill(billId);
    setIsPayingBill(true);
  };

  const handleDeleteBill = (billId: string) => {
    setBillToDelete(billId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteBill(billToDelete);
      
      // We don't need to explicitly call refresh as the realtime will update automatically
      // but keeping it for safety
      await refreshBills();
    } catch (error) {
      console.error('Error deleting bill:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const handleAddBillClose = async () => {
    setIsAddingBill(false);
    // Refresh already handled by realtime, but keeping for safety
    await refreshBills();
  };

  const handlePayBillClose = async () => {
    setIsPayingBill(false);
    setSelectedBill(null);
    // Refresh already handled by realtime, but keeping for safety
    await refreshBills();
  };

  const isLoading = billsLoading || billsDataLoading;

  return {
    bills: localBills,
    categories,
    isLoading,
    isAddingBill,
    setIsAddingBill, 
    isPayingBill,
    setIsPayingBill,
    selectedBill,
    activeTab,
    setActiveTab,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    billToDelete,
    isDeleting,
    groupedBills,
    sortedDates,
    handlePayBill,
    handleDeleteBill,
    confirmDeleteBill,
    handleAddBillClose,
    handlePayBillClose
  };
};
