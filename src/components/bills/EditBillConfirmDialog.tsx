
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface EditBillConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: any;
  onEditSingle: () => void;
  onEditAll: () => void;
  isLoading: boolean;
}

export const EditBillConfirmDialog: React.FC<EditBillConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  bill,
  onEditSingle,
  onEditAll,
  isLoading
}) => {
  const handleEditSingle = () => {
    onEditSingle();
    onOpenChange(false);
  };
  
  const handleEditAll = () => {
    onEditAll();
    onOpenChange(false);
  };
  
  if (!bill) {
    return null;
  }
  
  const title = bill.is_installment 
    ? "Editar parcela"
    : bill.is_recurring 
      ? "Editar lançamento recorrente" 
      : "Editar conta";

  const message = bill.is_installment && !bill.parent_bill_id
    ? "Esta é uma parcela principal. Deseja editar apenas esta parcela ou todas as parcelas relacionadas?"
    : bill.is_installment && bill.parent_bill_id
      ? "Esta é uma parcela. Deseja editar apenas esta parcela ou todas as parcelas relacionadas?"
      : bill.is_recurring
        ? "Este é um lançamento recorrente. Deseja editar apenas este lançamento ou todos os lançamentos recorrentes futuros?"
        : "";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {(bill.is_installment || bill.is_recurring) && (
            <DialogDescription>{message}</DialogDescription>
          )}
        </DialogHeader>
        
        <DialogFooter className="flex sm:justify-between">
          <Button
            variant="secondary"
            onClick={handleEditSingle}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Editar apenas esta
          </Button>
          
          {(bill.is_installment || bill.is_recurring) && (
            <Button
              onClick={handleEditAll}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Editar todas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
