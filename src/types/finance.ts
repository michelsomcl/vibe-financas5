
// Shared types for the finance context
export type TransactionType = 'income' | 'expense';
export type BillStatus = 'pending' | 'paid' | 'cancelled';
export type RecurrenceType = 'monthly' | 'weekly' | 'yearly' | null;

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'cash' | 'credit' | 'investment';
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  categoryId: string;
  accountId: string;
  description: string;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  categoryId: string;
  status: BillStatus;
  isRecurring: boolean;
  recurrenceType: RecurrenceType;
  recurrenceEndDate: Date | null;
  isInstallment: boolean;
  totalInstallments: number | null;
  currentInstallment: number | null;
  parentBillId: string | null;
}

export interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  bills: Bill[];
  loading: boolean;
  billsLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  editCategory: (id: string, category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  editAccount: (id: string, account: Omit<Account, 'id'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  addBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  editBill: (id: string, bill: Omit<Bill, 'id'>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  payBill: (billId: string, accountId: string) => Promise<void>;
}
