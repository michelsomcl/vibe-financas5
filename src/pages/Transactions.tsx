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
import { enableRealtimeForTable, enableRealtimeForAllTables } from '@/integrations/supabase/realtimeHelper';

const Transactions = () => {
  const { transactions, categories, accounts, loading } = useFinance();
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);
  const [localAccounts, setLocalAccounts] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);
  
  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  // Enable real-time updates for all tables when component mounts
  useEffect(() => {
    // Habilitar realtime para todas as tabelas
    enableRealtimeForAllTables();
    
    // Set up individual listeners for all tables
    const setupRealtimeListeners = async () => {
      console.log('Setting up realtime listeners for transactions and accounts');
      
      // Transaction changes channel
      const transactionsChannel = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          async (payload) => {
            console.log('Transaction change detected:', payload);
            // Refresh transactions data
            const { data: transData } = await supabase.from('transactions').select('*');
            if (transData) {
              const formattedTransactions = transData.map((trans) => ({
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
        
      // Accounts changes channel  
      const accountsChannel = supabase
        .channel('accounts-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts' },
          async (payload) => {
            console.log('Account change detected:', payload);
            // Refresh accounts data
            const { data: accData } = await supabase.from('accounts').select('*');
            if (accData) {
              const formattedAccounts = accData.map((acc) => ({
                id: acc.id,
                name: acc.name,
                balance: Number(acc.balance),
                type: acc.type,
              }));
              setLocalAccounts(formattedAccounts);
            }
          }
        )
        .subscribe();

      // Clean up the subscriptions when component unmounts
      return () => {
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(accountsChannel);
      };
    };
    
    setupRealtimeListeners();
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
        const account = localAccounts.find(a => a.id === transaction.accountId);
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
        
        // Check if this transaction is related to a bill payment
        // If it's a payment from a bill, we need to update the bill status back to pending
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .select('*')
          .eq('id', transaction.id);
          
        if (!billError && billData && billData.length > 0) {
          // This is a transaction that was created from a bill payment
          // Update the bill status back to pending
          const { error: updateBillError } = await supabase
            .from('bills')
            .update({ status: 'pending' })
            .eq('id', transaction.id);
            
          if (updateBillError) {
            console.error('Error updating associated bill:', updateBillError);
          }
        }
        
        // Also check for any bill with a description matching this transaction
        // This handles the case where transaction description starts with "Pagamento: "
        if (transaction.description.startsWith('Pagamento: ')) {
          const billDescription = transaction.description.replace('Pagamento: ', '');
          
          // Find bills with this description that are marked as paid
          const { data: relatedBills } = await supabase
            .from('bills')
            .select('*')
            .eq('description', billDescription)
            .eq('status', 'paid');
            
          if (relatedBills && relatedBills.length > 0) {
            // Update the most recently paid bill with this description back to pending
            const mostRecentBill = relatedBills[0];
            
            const { error: updateBillError } = await supabase
              .from('bills')
              .update({ status: 'pending' })
              .eq('id', mostRecentBill.id);
              
            if (updateBillError) {
              console.error('Error updating related bill:', updateBillError);
            }
          }
        }

        // Update local state is now handled by the realtime subscription
        
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
                    const account = localAccounts.find(a => a.id === transaction.accountId);
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
