import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Loader2 } from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AccountBalanceEditForm from '@/components/AccountBalanceEditForm';
import AccountForm from '@/components/AccountForm';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

const Accounts = () => {
  const { accounts, loading } = useFinance();
  const [localAccounts, setLocalAccounts] = useState<any[]>([]);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  // Enable real-time updates for accounts
  useEffect(() => {
    // Enable real-time for the accounts table
    enableRealtimeForTable('accounts');

    // Set up a realtime listener for account changes
    const channel = supabase
      .channel('accounts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        async () => {
          // Refresh accounts data whenever there's a change
          await refreshAccounts();
        }
      )
      .subscribe();

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array means this runs once on mount

  const refreshAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        const formattedAccounts = data.map(acc => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type,
        }));
        
        setLocalAccounts(formattedAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBalance = (account: any) => {
    setSelectedAccount(account);
    setIsEditingBalance(true);
  };

  const handleCreateAccount = () => {
    setIsCreatingAccount(true);
  };

  const getTotalBalance = () => {
    return localAccounts.reduce((total, account) => total + account.balance, 0);
  };

  if (loading && localAccounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando contas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suas Contas"
        description="Gerencie suas contas bancárias"
        action={
          <Button onClick={handleCreateAccount}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {localAccounts.map((account) => (
          <Card key={account.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{account.name}</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => handleEditBalance(account)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {account.type === 'bank' && 'Conta Bancária'}
                {account.type === 'cash' && 'Dinheiro em Espécie'}
                {account.type === 'investment' && 'Investimento'}
                {account.type === 'credit' && 'Cartão de Crédito'}
              </p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Saldo Total</h3>
        <p className="text-3xl font-bold">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getTotalBalance())}
        </p>
      </Card>

      {/* Edit Balance Sheet */}
      <Sheet open={isEditingBalance} onOpenChange={setIsEditingBalance}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar Saldo</SheetTitle>
            <SheetDescription>
              Atualize o saldo da sua conta
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedAccount && (
              <AccountBalanceEditForm
                account={selectedAccount}
                onClose={() => setIsEditingBalance(false)}
                onSuccess={refreshAccounts}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Account Dialog */}
      <Dialog open={isCreatingAccount} onOpenChange={setIsCreatingAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>
              Crie uma nova conta para gerenciar suas finanças
            </DialogDescription>
          </DialogHeader>
          <AccountForm 
            onClose={() => setIsCreatingAccount(false)}
            onSuccess={refreshAccounts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;
