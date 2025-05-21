
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type AccountFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const AccountForm = ({ onClose, onSuccess }: AccountFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: '0',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert balance to number
      const balance = parseFloat(formData.balance.replace(',', '.'));
      
      const { error } = await supabase
        .from('accounts')
        .insert({
          name: formData.name,
          type: formData.type,
          balance,
        });

      if (error) throw error;
      
      toast({
        title: 'Conta criada',
        description: 'Sua conta foi criada com sucesso.',
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a conta. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Conta</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Conta</Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Conta Bancária</SelectItem>
            <SelectItem value="cash">Dinheiro em Espécie</SelectItem>
            <SelectItem value="investment">Investimento</SelectItem>
            <SelectItem value="credit">Cartão de Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="balance">Saldo Inicial</Label>
        <Input
          id="balance"
          name="balance"
          type="text"
          inputMode="decimal"
          value={formData.balance}
          onChange={handleChange}
          placeholder="0,00"
          required
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar Conta'}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;
