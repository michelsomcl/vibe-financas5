import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Filter, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

const Transactions = () => {
  const { transactions, categories, accounts, loading } = useFinance();
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Enable real-time updates for transactions
  useEffect(() => {
    // Enable real-time for the transactions table
    enableRealtimeForTable('transactions');
    
    // Set up a realtime listener for transaction changes
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async () => {
          // Refresh transactions data
          const { data } = await supabase.from('transactions').select('*');
          if (data) {
            const formattedTransactions = data.map((trans) => ({
              id: trans.id,
              type: trans.type,
              amount: Number(trans.amount),
              date: new Date(trans.date),
              categoryId: trans.category_id,
              accountId: trans.account_id,
              description: trans.description,
            }));
            setLocalTransactions(formattedTransactions);
          }
        }
      )
      .subscribe();

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const handleDeleteTransaction = async (transaction: any) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      setIsDeleting(true);
      try {
        // Find the affected account
        const account = accounts.find(a => a.id === transaction.accountId);
        if (!account) {
          throw new Error('Conta não encontrada');
        }
        
        // Calculate the new balance
        // For expenses, we add the amount back to the account
        // For income, we subtract the amount from the account
        const balanceChange = transaction.type === 'expense' ? transaction.amount : -transaction.amount;
        const newBalance = account.balance + balanceChange;
        
        // Update the account balance in Supabase
        const { error: accountError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', transaction.accountId);
        
        if (accountError) throw accountError;
        
        // Delete the transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);

        if (error) throw error;
        
        // If the transaction came from a bill, we also need to update the bill status
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .select('*')
          .eq('id', transaction.id);
        
        // If we found a bill with the same ID as the transaction, delete it too
        if (billData && billData.length > 0) {
          const { error: deleteBillError } = await supabase
            .from('bills')
            .delete()
            .eq('id', transaction.id);
            
          if (deleteBillError) {
            console.error('Error deleting associated bill:', deleteBillError);
          }
        }

        // Update local state
        setLocalTransactions(localTransactions.filter(t => t.id !== transaction.id));
        
        toast({
          title: 'Sucesso',
          description: 'Transação excluída com sucesso!',
        });
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao excluir a transação.',
          variant: 'destructive'
        });
      } finally {
        setIsDeleting(false);
      }
    }
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

        {filteredTransactions.length > 0 ? (
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
                            onClick={() => handleDeleteTransaction(transaction)}
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
        ) : (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-neutral-light opacity-50" />
            <h3 className="mt-2 text-lg font-medium">Nenhuma transação encontrada</h3>
            <p className="text-neutral-light">Tente mudar os filtros ou adicione uma nova transação</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Transactions;
