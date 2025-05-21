
import React from 'react';
import { Filter } from 'lucide-react';

interface TransactionFiltersProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedType: 'all' | 'income' | 'expense';
  setSelectedType: (type: 'all' | 'income' | 'expense') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  uniqueMonths: string[];
  categories: any[];
  formatMonthName: (month: string) => string;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory,
  uniqueMonths,
  categories,
  formatMonthName
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
      <div className="flex items-center gap-2 text-neutral-light">
        <Filter size={16} />
        <span>Filtros:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1 border rounded-md text-sm bg-white"
        >
          <option value="all">Todos os meses</option>
          {uniqueMonths.map((month) => (
            <option key={month} value={month}>
              {formatMonthName(month)}
            </option>
          ))}
        </select>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense')}
          className="px-3 py-1 border rounded-md text-sm bg-white"
        >
          <option value="all">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1 border rounded-md text-sm bg-white"
        >
          <option value="all">Todas as categorias</option>
          {categories
            .filter(c => selectedType === 'all' || c.type === selectedType)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
