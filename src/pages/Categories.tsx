
import { useState } from 'react';
import { useFinance, TransactionType } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import { ArrowUpCircle, ArrowDownCircle, PlusCircle, Loader2 } from 'lucide-react';

const Categories = () => {
  const { categories, addCategory, deleteCategory, loading } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🔹');
  const [type, setType] = useState<TransactionType>('expense');
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && icon) {
      setSubmitting(true);
      try {
        await addCategory({ name, icon, type });
        setName('');
        setIcon('🔹');
        setShowForm(false);
      } catch (error) {
        console.error('Error adding category:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === activeTab);

  // Common emoji sets for categories
  const expenseEmojis = ['🍔', '🚗', '🏠', '🏥', '📚', '🛍️', '💊', '📱', '💇', '✈️'];
  const incomeEmojis = ['💰', '💼', '💸', '📈', '🏆', '💻', '🏦', '💵', '💡', '🎁'];

  const emojis = activeTab === 'expense' ? expenseEmojis : incomeEmojis;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando categorias...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Categorias" 
        description="Gerencie suas categorias de transações"
        action={
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        }
      />
      
      <div className="space-y-6">
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'expense' ? 'default' : 'outline'}
            className={activeTab === 'expense' ? 'bg-expense text-white' : ''}
            onClick={() => setActiveTab('expense')}
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Despesas
          </Button>
          
          <Button
            variant={activeTab === 'income' ? 'default' : 'outline'}
            className={activeTab === 'income' ? 'bg-income text-white' : ''}
            onClick={() => setActiveTab('income')}
          >
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Receitas
          </Button>
        </div>
        
        {showForm && (
          <Card title="Nova Categoria">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome da categoria"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="icon">Ícone</Label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-100 p-2 rounded-md text-2xl min-w-10 text-center">
                      {icon}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setIcon(emoji)}
                          className={`p-1 rounded-md hover:bg-gray-100 ${emoji === icon ? 'bg-gray-200' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  className={type === 'expense' ? 'bg-expense text-white' : ''}
                  onClick={() => setType('expense')}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Despesa
                </Button>
                
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  className={type === 'income' ? 'bg-income text-white' : ''}
                  onClick={() => setType('income')}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Receita
                </Button>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
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
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Categoria'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
        
        <Card>
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <div 
                  key={category.id} 
                  className="p-3 border rounded-lg flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteCategory(category.id)}
                  >
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-neutral-light py-8">
              Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'receita'} encontrada
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Categories;
