
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DateInput from "@/components/DateInput";

const schema = z.object({
  description: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres.",
  }),
  amount: z.string().refine((value) => {
    const parsedValue = parseFloat(value);
    return !isNaN(parsedValue) && parsedValue > 0;
  }, {
    message: "O valor deve ser um número maior que zero.",
  }),
  due_date: z.date(),
  category_id: z.string().min(1, {
    message: "Selecione uma categoria.",
  }),
  is_paid: z.boolean().default(false),
  is_recurring: z.boolean().default(false),
  recurrence_type: z.string().nullable().optional(),
  recurrence_occurrences: z.string().nullable().optional(),
  is_installment: z.boolean().default(false),
  total_installments: z.string().nullable().optional(),
});

interface BillFormProps {
  bill?: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    category_id: string;
    status: string;
    is_recurring?: boolean;
    recurrence_type?: string | null;
    recurrence_end_date?: string | null;
    is_installment?: boolean;
    total_installments?: number | null;
  };
  onClose?: () => void;
}

type FormData = z.infer<typeof schema>;

const BillForm = ({ bill, onClose }: BillFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: bill?.description || "",
      amount: bill?.amount?.toString() || "",
      due_date: bill?.due_date ? new Date(bill.due_date) : new Date(),
      category_id: bill?.category_id || "",
      is_paid: bill?.status === "paid" || false,
      is_recurring: bill?.is_recurring || false,
      recurrence_type: bill?.recurrence_type || null,
      recurrence_occurrences: bill?.recurrence_end_date ? "12" : null, // Default value
      is_installment: bill?.is_installment || false,
      total_installments: bill?.total_installments?.toString() || null,
    },
  });

  const isRecurring = form.watch("is_recurring");
  const isInstallment = form.watch("is_installment");

  // Reset related fields when toggling options
  useEffect(() => {
    if (!isRecurring) {
      form.setValue("recurrence_type", null);
      form.setValue("recurrence_occurrences", null);
    }
    if (!isInstallment) {
      form.setValue("total_installments", null);
    }
    // Ensure users can't select both options
    if (isRecurring && isInstallment) {
      form.setValue("is_installment", false);
    }
  }, [isRecurring, isInstallment, form]);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        toast({
          title: "Erro ao carregar categorias",
          description: "Ocorreu um erro ao carregar as categorias.",
          variant: "destructive",
        });
        return [];
      }

      return data;
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const parsedValue = parseFloat(data.amount);

      if (isNaN(parsedValue) || parsedValue <= 0) {
        toast({
          title: "Erro ao cadastrar conta",
          description: "O valor deve ser um número maior que zero.",
          variant: "destructive",
        });
        return;
      }

      const dueDate = new Date(data.due_date);
      const dueDateStr = format(dueDate, 'yyyy-MM-dd');
      const selectedDay = dueDate.getDate();

      const billData = {
        description: data.description,
        amount: parsedValue,
        due_date: dueDateStr,
        category_id: data.category_id,
        status: data.is_paid ? "paid" : "pending",
        is_recurring: data.is_recurring,
        recurrence_type: data.is_recurring ? data.recurrence_type : null,
        recurrence_end_date: null, // We'll calculate this based on occurrences
        is_installment: data.is_installment,
        total_installments: data.is_installment && data.total_installments 
          ? parseInt(data.total_installments, 10) 
          : null,
      };

      if (bill) {
        // Update existing bill
        const { error } = await supabase
          .from("bills")
          .update(billData)
          .eq("id", bill.id);

        if (error) {
          console.error("Error updating bill:", error);
          toast({
            title: "Erro ao atualizar conta",
            description: "Ocorreu um erro ao atualizar a conta.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Conta atualizada",
          description: "Conta atualizada com sucesso!",
        });
      } else {
        // Create new bill (first installment or first occurrence)
        const { data: newBill, error } = await supabase
          .from("bills")
          .insert({
            ...billData,
            current_installment: data.is_installment ? 1 : null,
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting bill:", error);
          toast({
            title: "Erro ao cadastrar conta",
            description: "Ocorreu um erro ao cadastrar a conta.",
            variant: "destructive",
          });
          return;
        }

        // If it's an installment bill, create all installments
        if (data.is_installment && data.total_installments && parseInt(data.total_installments) > 1) {
          const installmentPromises = [];
          const totalInstallments = parseInt(data.total_installments);
          
          // Create additional installments
          for (let i = 2; i <= totalInstallments; i++) {
            // Calculate due date for each installment (add i-1 months to original due date)
            const installmentDueDate = new Date(dueDate);
            installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));
            
            // Ensure we maintain the same day of month
            const lastDayOfMonth = new Date(installmentDueDate.getFullYear(), installmentDueDate.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(selectedDay, lastDayOfMonth);
            installmentDueDate.setDate(targetDay);
            
            installmentPromises.push(
              supabase.from("bills").insert({
                description: data.description,
                amount: parsedValue,
                due_date: format(installmentDueDate, "yyyy-MM-dd"),
                category_id: data.category_id,
                status: "pending",
                is_installment: true,
                total_installments: totalInstallments,
                current_installment: i,
                parent_bill_id: newBill.id,
              })
            );
          }
          
          // Wait for all installments to be created
          await Promise.all(installmentPromises);
        }

        // If it's a recurring bill, create all occurrences
        if (data.is_recurring && data.recurrence_type && data.recurrence_occurrences) {
          const recurrencePromises = [];
          let nextDueDate = new Date(dueDate);
          const totalOccurrences = parseInt(data.recurrence_occurrences);
          
          // Create future recurrences based on the number of occurrences
          for (let i = 1; i < totalOccurrences; i++) { // Start at 1 because we've already created the first occurrence
            // Calculate next due date based on recurrence type
            if (data.recurrence_type === 'monthly') {
              nextDueDate = new Date(nextDueDate);
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              
              // Ensure we maintain the same day of month
              const lastDayOfMonth = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate();
              const targetDay = Math.min(selectedDay, lastDayOfMonth);
              nextDueDate.setDate(targetDay);
            } else if (data.recurrence_type === 'weekly') {
              nextDueDate = new Date(nextDueDate);
              nextDueDate.setDate(nextDueDate.getDate() + 7);
            } else if (data.recurrence_type === 'yearly') {
              nextDueDate = new Date(nextDueDate);
              nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            }
            
            recurrencePromises.push(
              supabase.from("bills").insert({
                description: data.description,
                amount: parsedValue,
                due_date: format(nextDueDate, "yyyy-MM-dd"),
                category_id: data.category_id,
                status: "pending",
                is_recurring: data.is_recurring,
                recurrence_type: data.recurrence_type
              })
            );
          }
          
          // Wait for all recurrences to be created
          await Promise.all(recurrencePromises);
        }

        toast({
          title: "Conta cadastrada",
          description: "Conta cadastrada com sucesso!",
        });
      }

      onClose && onClose();
      navigate("/contas-a-pagar");
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Erro ao cadastrar conta",
        description: "Ocorreu um erro ao cadastrar a conta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 150,00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Vencimento</FormLabel>
              <FormControl>
                <DateInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="DD/MM/AAAA"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-medium">Tipo de lançamento</h3>
          
          <FormField
            control={form.control}
            name="is_installment"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Parcelado</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Dividir em várias parcelas
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) form.setValue("is_recurring", false);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isInstallment && (
            <FormField
              control={form.control}
              name="total_installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de parcelas</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ex: 12" 
                      {...field} 
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) > 0) {
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Recorrente</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Se repete periodicamente
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) form.setValue("is_installment", false);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isRecurring && (
            <>
              <FormField
                control={form.control}
                name="recurrence_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de recorrência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurrence_occurrences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de ocorrências</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 12" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || parseInt(value) > 0) {
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <FormField
          control={form.control}
          name="is_paid"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Pago</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Marque se a conta já foi paga.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isLoadingCategories}
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              {bill ? "Atualizando..." : "Criando..."}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {bill ? "Atualizar Conta" : "Cadastrar Conta"}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default BillForm;
