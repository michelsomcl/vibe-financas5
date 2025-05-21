
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Category, TransactionType } from '@/types/finance';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

export const useCategoriesData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');
        
        if (categoriesError) throw categoriesError;

        // Format categories
        const formattedCategories = categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type as TransactionType,
          icon: cat.icon,
          color: cat.color,
        }));

        setCategories(formattedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Erro ao carregar categorias');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    enableRealtimeForTable('categories');

    // Set up real-time subscription for categories
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory = {
        id: data.id,
        name: data.name,
        type: data.type as TransactionType,
        icon: data.icon,
        color: data.color,
      };

      setCategories([...categories, newCategory]);
      toast.success('Categoria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria');
    }
  };

  const editCategory = async (id: string, category: Omit<Category, 'id'>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        })
        .eq('id', id);

      if (error) throw error;

      setCategories(
        categories.map((c) => (c.id === id ? { ...category, id } : c))
      );
      toast.success('Categoria atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  return {
    categories,
    loading,
    addCategory,
    editCategory,
    deleteCategory,
    getCategoryById
  };
};
