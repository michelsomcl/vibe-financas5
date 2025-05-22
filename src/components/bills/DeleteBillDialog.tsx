
import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  billToDelete: string | null;
  bills: any[];
  isDeleting: boolean;
  onConfirmDelete: () => void;
}

export const DeleteBillDialog: React.FC<DeleteBillDialogProps> = ({
  isOpen,
  onOpenChange,
  billToDelete,
  bills,
  isDeleting,
  onConfirmDelete
}) => {
  // Find the bill to display appropriate message
  const bill = bills.find(b => b.id === billToDelete);
  const [hasTransaction, setHasTransaction] = useState(false);
  const [hasChildInstallments, setHasChildInstallments] = useState(false);
  const [hasFollowingRecurrences, setHasFollowingRecurrences] = useState(false);

  useEffect(() => {
    if (billToDelete) {
      // Check if this is a parent installment with children
      const childInstallments = bills.filter(b => b.parent_bill_id === billToDelete);
      setHasChildInstallments(childInstallments.length > 0);
      
      // Check if this is a recurring bill with future occurrences
      if (bill?.is_recurring) {
        // Find occurrences with same description and due date after this one
        const currentDueDate = new Date(bill.due_date);
        const followingRecurrences = bills.filter(b => 
          b.id !== bill.id && 
          b.description === bill.description &&
          b.is_recurring === true &&
          new Date(b.due_date) > currentDueDate
        );
        setHasFollowingRecurrences(followingRecurrences.length > 0);
      }
      
      // Check for transactions with the same ID as the bill
      const checkTransaction = async () => {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', billToDelete);
          
        if (data && data.length > 0) {
          console.log('Found matching transaction for bill:', data[0]);
          setHasTransaction(true);
        } else {
          // Also check for transactions that might mention this bill in their description
          const billDesc = bill?.description;
          if (billDesc) {
            const { data: relatedTransactions } = await supabase
              .from('transactions')
              .select('*')
              .ilike('description', `Pagamento: ${billDesc}%`);
              
            setHasTransaction(relatedTransactions && relatedTransactions.length > 0);
          } else {
            setHasTransaction(false);
          }
        }
      };
      
      checkTransaction();
    }
  }, [billToDelete, bill, bills]);

  const handleConfirmDelete = async () => {
    try {
      onConfirmDelete();
    } catch (error) {
      console.error("Error during bill deletion:", error);
      toast.error("Erro ao excluir conta a pagar. Tente novamente.");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente esta conta.
            {bill?.is_installment && !bill?.parent_bill_id && hasChildInstallments && 
              ' Esta é uma parcela principal. Todas as parcelas relacionadas serão excluídas primeiro.'}
            {bill?.is_installment && bill?.parent_bill_id && 
              ' Como é uma parcela, apenas esta parcela será excluída.'}
            {bill?.is_recurring && hasFollowingRecurrences &&
              ' Os lançamentos seguintes do tipo Recorrente também serão excluídos.'}
            {hasTransaction &&
              ' Há uma transação relacionada que também será afetada.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete} 
            disabled={isDeleting} 
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
