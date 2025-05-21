import { useEffect, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip, Legend } from 'recharts';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Loader2, Calendar } from 'lucide-react';
import { format, isSameMonth, isAfter, isBefore, startOfToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

const Dashboard = () => {
  const { transactions, categories, accounts, bills, loading, billsLoading } = useFinance();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [todayBills, setTodayBills] = useState<any[]>([]);
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);
  const [localAccounts, setLocalAccounts] = useState<any[]>([]);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  // Enable real-time updates for accounts and transactions
  useEffect(() => {
    // Enable real-time for both tables
    enableRealtimeForTable('accounts');
    enableRealtimeForTable('transactions');

    // Set up listeners
    const accountsChannel = supabase
      .channel('dashboard-accounts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        async () => {
          // Refresh accounts data
          const { data } = await supabase.from('accounts').select('*');
          if (data) {
            const formattedAccounts = data.map(acc => ({
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
      
    const transactionsChannel = supabase
      .channel('dashboard-transactions-changes')
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

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, []);

  useEffect(() => {
    // Calculate totals
    const income = localTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = localTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    setTotalIncome(income);
    setTotalExpense(expense);
    
    // Calculate total balance from all accounts
    const balance = localAccounts.reduce((acc, account) => acc + account.balance, 0);
    setTotalBalance(balance);

    // Prepare category data for pie chart
    const expensesByCategory = localTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const category = categories.find(c => c.id === transaction.categoryId);
        if (category) {
          acc[category.name] = (acc[category.name] || 0) + transaction.amount;
        }
        return acc;
      }, {} as Record<string, number>);

    const categoryPieData = Object.entries(expensesByCategory).map(([name, value]) => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        value,
        icon: category?.icon || '🔹',
      };
    });
    
    setCategoryData(categoryPieData);

    // Prepare monthly data for line chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTransactions = localTransactions.filter(t => 
      new Date(t.date) >= sixMonthsAgo
    );

    const monthlyGrouped = monthlyTransactions.reduce((acc, transaction) => {
      const month = format(new Date(transaction.date), 'MMM');
      
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 };
      }
      
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expense += transaction.amount;
      }
      
      return acc;
    }, {} as Record<string, { month: string; income: number; expense: number }>);
    
    setMonthlyData(Object.values(monthlyGrouped));

    // Filter bills for dashboard cards
    const today = startOfToday();
    
    // Upcoming bills (due in the next 7 days but not overdue)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcoming = bills
      .filter(b => 
        b.status === 'pending' &&
        isAfter(new Date(b.dueDate), today) && 
        isBefore(new Date(b.dueDate), sevenDaysFromNow)
      )
      .slice(0, 3);
    setUpcomingBills(upcoming);
    
    // Overdue bills
    const overdue = bills
      .filter(b => 
        b.status === 'pending' && 
        isBefore(new Date(b.dueDate), today)
      )
      .slice(0, 3);
    setOverdueBills(overdue);
    
    // Today's bills
    const due = bills
      .filter(b => {
        const billDate = new Date(b.dueDate);
        return b.status === 'pending' && 
          billDate.getDate() === today.getDate() &&
          billDate.getMonth() === today.getMonth() &&
          billDate.getFullYear() === today.getFullYear();
      })
      .slice(0, 3);
    setTodayBills(due);

  }, [localTransactions, localAccounts, categories, bills]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

  if (loading || billsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Visão Geral" description="Acompanhe suas finanças em um só lugar" />
      
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

      {/* Bills Cards */}
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
                          {format(new Date(bill.dueDate), 'dd/MM/yyyy')}
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
                          {format(new Date(bill.dueDate), 'dd/MM/yyyy')}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Gastos por Categoria">
          <div className="h-80 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-neutral-light">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </Card>

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
      </div>

      <Card title="Últimas Transações">
        {localTransactions.length > 0 ? (
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
                {localTransactions
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
    </div>
  );
};

export default Dashboard;
