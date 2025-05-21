
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Account } from '@/types/finance';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useAccountsData = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        
        // Fetch accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*');
        
        if (accountsError) throw accountsError;

        // Format accounts
        const formattedAccounts = accountsData.map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance),
          type: acc.type as 'bank' | 'cash' | 'credit' | 'investment',
        }));

        setAccounts(formattedAccounts);
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Erro ao carregar contas');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
    enableRealtimeForTable('accounts');

    // Set up real-time subscription for accounts
    const channel = supabase
      .channel('accounts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => {
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: account.name,
          balance: account.balance,
          type: account.type,
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount = {
        id: data.id,
        name: data.name,
        balance: Number(data.balance),
        type: data.type as 'bank' | 'cash' | 'credit' | 'investment',
      };

      setAccounts([...accounts, newAccount]);
      toast.success('Conta adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Erro ao adicionar conta');
    }
  };

  const editAccount = async (id: string, account: Omit<Account, 'id'>) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: account.name,
          balance: account.balance,
          type: account.type,
        })
        .eq('id', id);

      if (error) throw error;

      setAccounts(
        accounts.map((a) => (a.id === id ? { ...account, id } : a))
      );
      toast.success('Conta atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Erro ao atualizar conta');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAccounts(accounts.filter((a) => a.id !== id));
      toast.success('Conta excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const getAccountById = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  return {
    accounts,
    loading,
    addAccount,
    editAccount,
    deleteAccount,
    getAccountById
  };
};
