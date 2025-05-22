
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Safely formats a date to a string
 * @param dateValue Any value that can be converted to a date
 * @param formatString Format pattern for date-fns
 * @returns Formatted date string or fallback message
 */
export const formatSafeDate = (dateValue: any, formatString: string = 'dd/MM/yyyy'): string => {
  const date = new Date(dateValue);
  return isValid(date) ? format(date, formatString) : 'Data inválida';
};

/**
 * Formats a monetary value to Brazilian Real (R$)
 * @param value Numeric value to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

/**
 * Formats a month string name from a year-month string
 * @param monthStr String in format "YYYY-MM"
 * @returns Localized month and year string
 */
export const formatMonthName = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
};
