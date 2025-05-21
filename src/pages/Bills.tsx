import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { format, isBefore, isEqual, isToday } from 'date-fns';
import BillForm from '@/components/BillForm';
import BillPaymentForm from '@/components/BillPaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BillsList } from '@/components/bills/BillsList';
import { DeleteBillDialog } from '@/components/bills/DeleteBillDialog';
import { useBills } from '@/hooks/useBills';
import { enableRealtimeForAllTables } from '@/integrations/supabase/realtimeHelper';

const Bills = () => {
  const { categories, billsLoading, deleteBill } = useFinance();
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Use the custom useBills hook for fetching and managing bills
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
      
      // Não precisamos chamar o refresh explicitamente, pois o realtime vai atualizar automaticamente
      // mas manteremos por segurança
      await refreshBills();
      
      toast({
        title: 'Conta excluída',
        description: 'A conta foi excluída com sucesso.'
      });
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Erro ao excluir conta',
        description: 'Ocorreu um erro ao excluir a conta.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const handleAddBillClose = async () => {
    setIsAddingBill(false);
    // O refresh já será feito pelo realtime, mas mantemos por segurança
    await refreshBills();
  };

  const handlePayBillClose = async () => {
    setIsPayingBill(false);
    setSelectedBill(null);
    // O refresh já será feito pelo realtime, mas mantemos por segurança
    await refreshBills();
  };

  const isLoading = billsLoading || billsDataLoading;

  if (isLoading && localBills.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando contas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie suas contas e parcelas"
        action={
          <Button onClick={() => setIsAddingBill(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        }
      />

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
        </TabsList>

        <BillsList 
          groupedBills={groupedBills} 
          sortedDates={sortedDates} 
          onPayBill={handlePayBill} 
          onDeleteBill={handleDeleteBill} 
          activeTab={activeTab}
        />
      </Tabs>

      {/* Add Bill Sheet */}
      <Sheet open={isAddingBill} onOpenChange={setIsAddingBill}>
        <SheetContent className="sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader>
            <SheetTitle>Nova Conta a Pagar</SheetTitle>
            <SheetDescription>
              Adicione uma nova conta, parcela ou conta recorrente
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BillForm onClose={handleAddBillClose} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Bill Sheet */}
      <Sheet open={isPayingBill} onOpenChange={setIsPayingBill}>
        <SheetContent className="sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader>
            <SheetTitle>Registrar Pagamento</SheetTitle>
            <SheetDescription>
              Selecione a conta para realizar o pagamento
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BillPaymentForm 
              billId={selectedBill || ''}
              onClose={handlePayBillClose} 
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteBillDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        billToDelete={billToDelete}
        bills={localBills}
        isDeleting={isDeleting}
        onConfirmDelete={confirmDeleteBill}
      />
    </div>
  );
};

export default Bills;
