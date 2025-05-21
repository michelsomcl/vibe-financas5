
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

  // Check if this bill has a corresponding transaction that needs to be deleted
  useEffect(() => {
    if (billToDelete) {
      // Look for transactions with the same ID as the bill
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
  }, [billToDelete, bill]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente esta conta.
            {bill?.is_installment && !bill?.parent_bill_id && 
              ' Se for a parcela principal, todas as parcelas serão excluídas.'}
            {bill?.is_installment && bill?.parent_bill_id && 
              ' Como é uma parcela, apenas esta parcela será excluída.'}
            {bill?.is_recurring &&
              ' Se for uma conta recorrente, apenas esta ocorrência será excluída.'}
            {hasTransaction &&
              ' Há uma transação relacionada que também será afetada.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirmDelete} 
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
