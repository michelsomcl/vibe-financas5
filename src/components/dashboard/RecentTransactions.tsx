
import React from 'react';
import Card from '@/components/Card';
import { format } from 'date-fns';

interface RecentTransactionsProps {
  transactions: any[];
  categories: any[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, categories }) => {
  return (
    <Card title="Últimas Transações">
      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">Descrição</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((transaction) => {
                  const category = categories.find(c => c.id === transaction.categoryId);
                  return (
                    <tr key={transaction.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3">{transaction.description}</td>
                      <td className="py-3">{format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                      <td className="py-3 flex items-center gap-2">
                        <span>{category?.icon}</span>
                        {category?.name}
                      </td>
                      <td className={`py-3 text-right ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'} 
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-neutral-light text-center py-4">Nenhuma transação registrada</p>
      )}
    </Card>
  );
};
