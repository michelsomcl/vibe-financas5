
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "DD/MM/AAAA", 
  className = "",
  disabled = false
}) => {
  // Convert Date object to formatted string
  const [inputValue, setInputValue] = useState<string>('');
  
  // Update input value when date value changes
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Apply mask for date input (XX/XX/XXXX)
    let maskedValue = newValue.replace(/\D/g, '');
    if (maskedValue.length > 0) {
      maskedValue = maskedValue.substring(0, 8);
      
      if (maskedValue.length > 4) {
        maskedValue = `${maskedValue.substring(0, 2)}/${maskedValue.substring(2, 4)}/${maskedValue.substring(4)}`;
      } else if (maskedValue.length > 2) {
        maskedValue = `${maskedValue.substring(0, 2)}/${maskedValue.substring(2)}`;
      }
    }
    
    if (maskedValue !== newValue) {
      setInputValue(maskedValue);
    }
    
    // Parse the entered date
    if (maskedValue.length === 10) {
      try {
        const parsedDate = parse(maskedValue, 'dd/MM/yyyy', new Date(), { locale: ptBR });
        
        if (isValid(parsedDate)) {
          onChange(parsedDate);
        } else {
          // If date is invalid, don't update the parent component
          console.log('Invalid date entered');
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  };

  const handleBlur = () => {
    // Validate the date when user leaves the field
    if (inputValue.length && inputValue.length !== 10) {
      // Reset to previous valid date or empty
      if (value && isValid(value)) {
        setInputValue(format(value, 'dd/MM/yyyy'));
      } else {
        setInputValue('');
      }
    }
  };

  return (
    <Input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      maxLength={10}
    />
  );
};

export default DateInput;
