import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Account } from '@/types/finance';

interface BillPaymentFormProps {
  billId: string;
  onClose: () => void;
}

const formSchema = z.object({
  accountId: z.string({
    required_error: "Selecione uma conta",
  }),
});

const BillPaymentForm = ({ billId, onClose }: BillPaymentFormProps) => {
  const { accounts: contextAccounts } = useFinance();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch the latest account data directly from Supabase
  useEffect(() => {
    const fetchLatestAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        const formattedAccounts = data.map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type as 'bank' | 'cash' | 'credit' | 'investment',
        }));
        
        setAccounts(formattedAccounts);
      } catch (error) {
        console.error('Error fetching latest accounts:', error);
        // Fallback to context accounts if direct fetch fails
        setAccounts(contextAccounts);
      }
    };
    
    fetchLatestAccounts();
  }, [contextAccounts]);
  
  // Fetch the bill directly from Supabase
  useEffect(() => {
    const fetchBill = async () => {
      if (!billId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('id', billId)
          .single();
        
        if (error) {
          throw error;
        }
        
        setBill(data);
      } catch (error) {
        console.error('Error fetching bill:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da conta.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBill();
  }, [billId]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: '',
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <p className="text-red-500">Conta não encontrada</p>
        <Button onClick={onClose} className="mt-4">Fechar</Button>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. Update bill status to paid
      const { error: billError } = await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', billId);

      if (billError) throw billError;

      // 2. Create transaction for this payment
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: bill.amount,
          date: new Date().toISOString(),
          category_id: bill.category_id,
          account_id: values.accountId,
          description: `Pagamento: ${bill.description}`,
        });

      if (transactionError) throw transactionError;

      // 3. Update account balance
      const account = accounts.find(a => a.id === values.accountId);
      if (!account) {
        throw new Error('Conta não encontrada');
      }
      
      const newBalance = account.balance - bill.amount;
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', values.accountId);

      if (accountError) throw accountError;

      // 4. If it's a recurring bill, create the next occurrence - BUT ONLY IF IT DOESN'T EXIST ALREADY
      if (bill.is_recurring && bill.recurrence_type) {
        const nextDueDate = new Date(bill.due_date);
        
        // Calculate next due date based on recurrence type
        if (bill.recurrence_type === 'monthly') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } else if (bill.recurrence_type === 'weekly') {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (bill.recurrence_type === 'yearly') {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }
        
        // Only create new recurrence if it's before the end date
        if (!bill.recurrence_end_date || new Date(nextDueDate) <= new Date(bill.recurrence_end_date)) {
          // Check if a bill with the same description and due date already exists
          const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
          
          const { data: existingBills, error: checkError } = await supabase
            .from('bills')
            .select('id')
            .eq('description', bill.description)
            .eq('due_date', nextDueDateStr)
            .eq('amount', bill.amount)
            .eq('is_recurring', true);
            
          if (checkError) throw checkError;
          
          // Only create if no matching bill exists
          if (!existingBills || existingBills.length === 0) {
            await supabase.from('bills').insert({
              description: bill.description,
              amount: bill.amount,
              due_date: nextDueDateStr,
              category_id: bill.category_id,
              status: 'pending',
              is_recurring: bill.is_recurring,
              recurrence_type: bill.recurrence_type,
              recurrence_end_date: bill.recurrence_end_date
            });
          }
        }
      }

      toast({
        title: 'Pagamento realizado',
        description: 'Pagamento registrado com sucesso!'
      });
      
      onClose();
    } catch (error) {
      console.error('Error paying bill:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao registrar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">{bill.description}</h3>
          <p className="font-bold text-xl">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
          </p>
        </div>

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta para Débito</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length > 0 ? (
                    accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{account.name}</span>
                          <span className="text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-accounts" disabled>
                      Nenhuma conta disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BillPaymentForm;
