
import React from 'react';
import Card from '@/components/Card';
import { Calendar } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface BillsCardsProps {
  overdueBills: any[];
  todayBills: any[];
  upcomingBills: any[];
  categories: any[];
}

export const BillsCards: React.FC<BillsCardsProps> = ({ overdueBills, todayBills, upcomingBills, categories }) => {
  // Function to safely format dates
  const formatSafeDate = (dateValue: any) => {
    const date = new Date(dateValue);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : 'Data inválida';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {overdueBills.length > 0 && (
        <Card title="Contas Vencidas" icon={<Calendar className="text-red-500" />}>
          <div className="space-y-2">
            {overdueBills.map(bill => {
              const category = categories.find(c => c.id === bill.categoryId);
              return (
                <div key={bill.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <span className="mr-2">{category?.icon || '💰'}</span>
                    <div>
                      <p className="text-sm font-medium">{bill.description}</p>
                      <p className="text-xs text-neutral-light">
                        {formatSafeDate(bill.dueDate)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-red-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                  </span>
                </div>
              );
            })}
            {overdueBills.length > 0 && (
              <div className="pt-2 text-center">
                <a href="/contas-a-pagar" className="text-sm text-primary hover:underline">
                  Ver todas
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {todayBills.length > 0 && (
        <Card title="Contas para Hoje" icon={<Calendar className="text-orange-500" />}>
          <div className="space-y-2">
            {todayBills.map(bill => {
              const category = categories.find(c => c.id === bill.categoryId);
              return (
                <div key={bill.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <span className="mr-2">{category?.icon || '💰'}</span>
                    <div>
                      <p className="text-sm font-medium">{bill.description}</p>
                      <p className="text-xs text-neutral-light">
                        Vence hoje
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-orange-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                  </span>
                </div>
              );
            })}
            {todayBills.length > 0 && (
              <div className="pt-2 text-center">
                <a href="/contas-a-pagar" className="text-sm text-primary hover:underline">
                  Ver todas
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {upcomingBills.length > 0 && (
        <Card title="Próximas Contas" icon={<Calendar className="text-blue-500" />}>
          <div className="space-y-2">
            {upcomingBills.map(bill => {
              const category = categories.find(c => c.id === bill.categoryId);
              return (
                <div key={bill.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <span className="mr-2">{category?.icon || '💰'}</span>
                    <div>
                      <p className="text-sm font-medium">{bill.description}</p>
                      <p className="text-xs text-neutral-light">
                        {formatSafeDate(bill.dueDate)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                  </span>
                </div>
              );
            })}
            {upcomingBills.length > 0 && (
              <div className="pt-2 text-center">
                <a href="/contas-a-pagar" className="text-sm text-primary hover:underline">
                  Ver todas
                </a>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
