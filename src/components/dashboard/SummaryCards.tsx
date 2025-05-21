
import React from 'react';
import Card from '@/components/Card';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

interface SummaryCardsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ totalBalance, totalIncome, totalExpense }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-primary to-purple-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Saldo Total</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
            </h3>
          </div>
          <Wallet size={32} className="text-white/80" />
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Receitas</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
            </h3>
          </div>
          <ArrowUpCircle size={32} className="text-white/80" />
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Despesas</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
            </h3>
          </div>
          <ArrowDownCircle size={32} className="text-white/80" />
        </div>
      </Card>
    </div>
  );
};
