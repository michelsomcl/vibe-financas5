import { useState, useMemo } from 'react';
import { isAfter, isSameDay, parseISO, compareAsc } from 'date-fns';
import { toast } from 'sonner';
import { useBills } from '@/hooks/useBills';
import { useBillsData } from '@/hooks/finance/useBills';
import { useAccounts } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/FinanceContext';
import { Account, Transaction } from '@/types/finance';

export const useBillsPage = () => {
  // State
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [billToEdit, setBillToEdit] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get bills data
  const { bills: rawBills, loading: isLoading } = useBills();
  
  // Get accounts and transactions from FinanceContext
  const { accounts, setAccounts } = useAccounts();
  const { transactions, setTransactions } = useTransactions();
  
  // Get bills methods
  const { 
    deleteBill, 
    payBill,
    editBill
  } = useBillsData(
    accounts, 
    transactions, 
    setTransactions,
    setAccounts
  );

  // Processed bills for display
  const bills = useMemo(() => {
    if (!rawBills || rawBills.length === 0) return [];
    
    return rawBills.map((bill: any) => ({
      ...bill,
      due_date: bill.due_date,
      categories: bill.categories
    }));
  }, [rawBills]);

  // Group bills by due date for display
  const { groupedBills, sortedDates } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter bills based on active tab
    let filteredBills;
    
    switch (activeTab) {
      case 'overdue':
        filteredBills = bills.filter((bill: any) => {
          const dueDate = new Date(bill.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return isAfter(today, dueDate) && !isSameDay(today, dueDate) && bill.status === 'pending';
        });
        break;
      case 'today':
        filteredBills = bills.filter((bill: any) => {
          const dueDate = new Date(bill.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return isSameDay(today, dueDate) && bill.status === 'pending';
        });
        break;
      case 'upcoming':
        filteredBills = bills.filter((bill: any) => {
          const dueDate = new Date(bill.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return isAfter(dueDate, today) && bill.status === 'pending';
        });
        break;
      default: // 'all'
        filteredBills = bills.filter((bill: any) => bill.status === 'pending');
        break;
    }

    // Group bills by due date
    const grouped: Record<string, any[]> = {};
    
    filteredBills.forEach((bill: any) => {
      const dateKey = typeof bill.due_date === 'string' 
        ? bill.due_date.split('T')[0] 
        : bill.due_date.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(bill);
    });

    // Sort dates
    const sorted = Object.keys(grouped).sort((a, b) => {
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      return compareAsc(dateA, dateB);
    });

    return { groupedBills: grouped, sortedDates: sorted };
  }, [bills, activeTab]);

  // Handlers
  const handlePayBill = (billId: string) => {
    setSelectedBill(billId);
    setIsPayingBill(true);
  };

  const handleEditBill = (billId: string) => {
    const bill = bills.find((b: any) => b.id === billId);
    if (bill) {
      setBillToEdit(bill);
      setIsEditingBill(true);
      
      // If bill is not recurring or installment, open edit sheet directly
      if (!bill.is_recurring && !bill.is_installment) {
        setIsEditingBill(true);
      }
    }
  };

  const handleEditSingle = () => {
    // Open the edit form for only the selected bill
    if (billToEdit) {
      // Keep the edit sheet open after confirmation
      setIsEditingBill(true);
    }
  };

  const handleEditAll = async () => {
    // Handle editing all recurring bills or installments
    setIsEditing(true);
    try {
      if (!billToEdit) return;
      
      if (billToEdit.is_installment) {
        // Logic for editing all installments in a series
        toast.info("Editando todas as parcelas...");
        // Edit logic would go here
      } else if (billToEdit.is_recurring) {
        // Logic for editing all future recurring bills
        toast.info("Editando todos os lançamentos recorrentes futuros...");
        // Edit logic would go here
      }
    } catch (error) {
      console.error("Error during bill update:", error);
      toast.error("Erro ao atualizar contas a pagar. Tente novamente.");
    } finally {
      setIsEditing(false);
      setIsEditingBill(false);
    }
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
      toast.success("Conta a pagar excluída com sucesso!");
    } catch (error) {
      console.error("Error during bill deletion:", error);
      toast.error("Erro ao excluir conta a pagar. Tente novamente.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const handleAddBillClose = () => {
    setIsAddingBill(false);
  };

  const handlePayBillClose = () => {
    setIsPayingBill(false);
    setSelectedBill(null);
  };

  return {
    bills,
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
    handlePayBillClose,
    // New edit functionality
    isEditingBill,
    setIsEditingBill,
    billToEdit,
    handleEditBill,
    handleEditSingle,
    handleEditAll,
    isEditing
  };
};
