
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AccountBalanceEditFormProps {
  account: {
    id: string;
    name: string;
    balance: number;
    type: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  balance: z.string().refine((value) => {
    const parsed = parseFloat(value.replace(',', '.'));
    return !isNaN(parsed);
  }, {
    message: "O valor deve ser um número válido",
  }),
});

const AccountBalanceEditForm = ({ account, onClose, onSuccess }: AccountBalanceEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      balance: account.balance.toString(),
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const newBalance = parseFloat(values.balance.replace(',', '.'));
      
      const { error } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id);
      
      if (error) throw error;
      
      toast({
        title: "Saldo atualizado",
        description: "O saldo da conta foi atualizado com sucesso!",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating account balance:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o saldo da conta.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Editar Saldo</h3>
          <p className="text-sm text-muted-foreground">
            Conta: {account.name}
          </p>
        </div>
        
        <FormField
          control={form.control}
          name="balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo Saldo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0.00" 
                  {...field} 
                />
              </FormControl>
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
              'Salvar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountBalanceEditForm;
