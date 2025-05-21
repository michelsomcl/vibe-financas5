
import { Loader2 } from 'lucide-react';
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
import { Plus } from 'lucide-react';
import BillForm from '@/components/BillForm';
import BillPaymentForm from '@/components/BillPaymentForm';
import { BillsList } from '@/components/bills/BillsList';
import { DeleteBillDialog } from '@/components/bills/DeleteBillDialog';
import { useBillsPage } from '@/hooks/useBillsPage';

const Bills = () => {
  const {
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
    handlePayBillClose
  } = useBillsPage();

  if (isLoading && bills.length === 0) {
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
        bills={bills}
        isDeleting={isDeleting}
        onConfirmDelete={confirmDeleteBill}
      />
    </div>
  );
};

export default Bills;
