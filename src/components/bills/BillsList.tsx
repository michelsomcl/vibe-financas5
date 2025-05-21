
import React from 'react';
import Card from '@/components/Card';
import { Calendar, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, isBefore, isToday, isEqual } from 'date-fns';

interface BillsListProps {
  groupedBills: Record<string, any[]>;
  sortedDates: string[];
  onPayBill: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
  activeTab: string;
}

export const BillsList: React.FC<BillsListProps> = ({
  groupedBills,
  sortedDates,
  onPayBill,
  onDeleteBill,
  activeTab
}) => {
  if (sortedDates.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-neutral-light">Não há contas a pagar {activeTab !== 'all' ? 'neste período' : ''}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">
              {(() => {
                // Split the date string by '-' to get the components
                const dateParts = dateKey.split('-');
                if (dateParts.length === 3) {
                  // Format as DD/MM/YYYY to match Brazilian format
                  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                }
                // Fallback to the previous formatting if something goes wrong
                return format(new Date(dateKey), 'dd/MM/yyyy');
              })()}
              {isToday(new Date(dateKey)) && " (Hoje)"}
            </h3>
          </div>

          {groupedBills[dateKey].map((bill) => (
            <BillItem 
              key={bill.id} 
              bill={bill} 
              onPayBill={onPayBill} 
              onDeleteBill={onDeleteBill} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

interface BillItemProps {
  bill: any;
  onPayBill: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
}

const BillItem: React.FC<BillItemProps> = ({ bill, onPayBill, onDeleteBill }) => {
  // Parse the date string correctly to avoid timezone issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Parse the date directly from the YYYY-MM-DD format
  let dueDate: Date;
  if (typeof bill.due_date === 'string') {
    const dateParts = bill.due_date.split('-');
    dueDate = new Date(
      parseInt(dateParts[0]), // year
      parseInt(dateParts[1]) - 1, // month (0-indexed)
      parseInt(dateParts[2]) // day
    );
  } else {
    dueDate = new Date(bill.due_date);
  }
  dueDate.setHours(0, 0, 0, 0);
  
  const isOverdue = isBefore(dueDate, today) && !isEqual(dueDate, today);

  return (
    <Card key={bill.id} className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{bill.categories?.icon || '💰'}</span>
            <div>
              <h3 className="font-medium">
                {bill.description}
                {bill.is_installment && bill.current_installment && bill.total_installments && 
                  ` (${bill.current_installment}/${bill.total_installments})`
                }
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-neutral-light">
                <p>{bill.categories?.name}</p>
                {isOverdue && <span className="text-red-500 font-medium">Vencida</span>}
                {bill.is_recurring && <span className="text-blue-500">Recorrente</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-medium text-lg">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
          </span>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              onClick={() => onPayBill(bill.id)}
            >
              <Check className="mr-1 h-3 w-3" /> Pagar
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onDeleteBill(bill.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
