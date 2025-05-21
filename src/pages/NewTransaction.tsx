import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionType } from '@/types/finance';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const NewTransaction = () => {
  const navigate = useNavigate();
  const { categories, accounts, loading } = useFinance();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Valor inválido. Digite um número positivo.');
      return;
    }
    
    if (!categoryId) {
      setError('Selecione uma categoria.');
      return;
    }
    
    if (!accountId) {
      setError('Selecione uma conta.');
      return;
    }
    
    if (!description.trim()) {
      setError('Digite uma descrição.');
      return;
    }

    setSubmitting(true);
    
    try {
      // Get the selected account
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        throw new Error('Conta não encontrada');
      }

      const transactionAmount = parseFloat(amount);
      
      // Calculate new balance based on transaction type
      // For income, add to balance; for expense, subtract from balance
      const balanceChange = type === 'income' ? transactionAmount : -transactionAmount;
      const newBalance = account.balance + balanceChange;
      
      // Format the date properly for Supabase
      const formattedDate = format(new Date(date), 'yyyy-MM-dd');
      
      // First, insert the transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type,
          amount: transactionAmount,
          date: formattedDate,
          category_id: categoryId,
          account_id: accountId,
          description,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;
      
      // Then update the account balance
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', accountId);

      if (accountError) throw accountError;
      
      toast({
        title: 'Transação adicionada!',
        description: 'Sua transação foi registrada com sucesso.'
      });

      // Navigate back to transactions
      navigate('/transacoes');
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Erro ao adicionar transação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nova Transação" description="Adicione uma nova transação financeira" />

      <Card>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tipo de Transação</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  className={type === 'expense' ? 'bg-expense text-white' : ''}
                  onClick={() => {
                    setType('expense');
                    setCategoryId(''); // Reset category when changing type
                  }}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Despesa
                </Button>
                
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  className={type === 'income' ? 'bg-income text-white' : ''}
                  onClick={() => {
                    setType('income');
                    setCategoryId(''); // Reset category when changing type
                  }}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Receita
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Selecione uma categoria</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account">Conta</Label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva a transação"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/transacoes')}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                'Salvar Transação'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewTransaction;
