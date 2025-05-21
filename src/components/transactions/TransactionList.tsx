
import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionListProps {
  filteredTransactions: any[];
  categories: any[];
  accounts: any[];
  isDeleting: boolean;
  onDeleteTransaction: (transaction: any) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  filteredTransactions,
  categories,
  accounts,
  isDeleting,
  onDeleteTransaction
}) => {
  if (filteredTransactions.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar className="mx-auto h-12 w-12 text-neutral-light opacity-50" />
        <h3 className="mt-2 text-lg font-medium">Nenhuma transação encontrada</h3>
        <p className="text-neutral-light">Tente mudar os filtros ou adicione uma nova transação</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="pb-2 font-medium">Descrição</th>
            <th className="pb-2 font-medium">Data</th>
            <th className="pb-2 font-medium">Categoria</th>
            <th className="pb-2 font-medium">Conta</th>
            <th className="pb-2 font-medium text-right">Valor</th>
            <th className="pb-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((transaction) => {
              const category = categories.find(c => c.id === transaction.categoryId);
              const account = accounts.find(a => a.id === transaction.accountId);
              return (
                <tr key={transaction.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">{transaction.description}</td>
                  <td className="py-3">{format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                  <td className="py-3 flex items-center gap-2">
                    <span>{category?.icon}</span>
                    {category?.name}
                  </td>
                  <td className="py-3">{account?.name}</td>
                  <td className={`py-3 text-right ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'} 
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => onDeleteTransaction(transaction)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};
