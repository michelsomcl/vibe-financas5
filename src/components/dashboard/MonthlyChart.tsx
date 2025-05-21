
import React from 'react';
import Card from '@/components/Card';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Legend } from 'recharts';

interface MonthlyChartProps {
  monthlyData: any[];
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ monthlyData }) => {
  return (
    <Card title="Evolução Mensal">
      <div className="h-80 w-full">
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <XAxis dataKey="month" />
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
              />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#52c41a" />
              <Bar dataKey="expense" name="Despesas" fill="#ff4d4f" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-light">Nenhum dado disponível</p>
          </div>
        )}
      </div>
    </Card>
  );
};
