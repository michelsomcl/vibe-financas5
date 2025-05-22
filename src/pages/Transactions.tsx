
import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionList } from '@/components/transactions/TransactionList';

const Transactions = () => {
  const { categories } = useFinance();
  const { transactions, accounts, loading, isDeleting, deleteTransaction } = useTransactions();
  
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);

  // Update local transactions whenever the transactions prop changes
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Get all unique months from transactions
  const uniqueMonths = [...new Set(localTransactions.map(t => {
    const date = new Date(t.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }))].sort((a, b) => b.localeCompare(a));

  // Filter transactions
  const filteredTransactions = localTransactions.filter(transaction => {
    // Filter by type
    if (selectedType !== 'all' && transaction.type !== selectedType) {
      return false;
    }

    // Filter by category
    if (selectedCategory !== 'all' && transaction.categoryId !== selectedCategory) {
      return false;
    }

    // Filter by month
    if (selectedMonth !== 'all') {
      const date = new Date(transaction.date);
      const transactionMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (transactionMonth !== selectedMonth) {
        return false;
      }
    }

    return true;
  });

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: ptBR });
  };

  // Handle immediate UI update when deleting a transaction
  const handleDeleteTransaction = async (transaction: any) => {
    // Immediately remove transaction from UI
    setLocalTransactions(prev => prev.filter(t => t.id !== transaction.id));
    
    // Then perform the actual deletion in the background
    await deleteTransaction(transaction);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando transações...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Transações" 
        description="Gerencie suas transações financeiras"
        action={
          <Link to="/nova-transacao">
            <Button className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </Link>
        }
      />

      <Card>
        <TransactionFilters
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          uniqueMonths={uniqueMonths}
          categories={categories}
          formatMonthName={formatMonthName}
        />

        <TransactionList
          filteredTransactions={filteredTransactions}
          categories={categories}
          accounts={accounts}
          isDeleting={isDeleting}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </Card>
    </div>
  );
};

export default Transactions;
