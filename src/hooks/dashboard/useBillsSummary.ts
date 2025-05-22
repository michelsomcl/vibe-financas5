
import { useState, useEffect } from 'react';
import { isBefore, isAfter, startOfToday, isSameDay } from 'date-fns';

/**
 * Custom hook to organize bills into overdue, today, and upcoming categories
 */
export const useBillsSummary = (bills: any[]) => {
  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [todayBills, setTodayBills] = useState<any[]>([]);

  useEffect(() => {
    const today = startOfToday();
    
    // Upcoming bills (due in the next 7 days but not overdue)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcoming = bills
      .filter(b => 
        b.status === 'pending' &&
        isAfter(new Date(b.due_date), today) && 
        isBefore(new Date(b.due_date), sevenDaysFromNow)
      )
      .slice(0, 3);
    setUpcomingBills(upcoming);
    
    // Overdue bills
    const overdue = bills
      .filter(b => 
        b.status === 'pending' && 
        isBefore(new Date(b.due_date), today)
      )
      .slice(0, 3);
    setOverdueBills(overdue);
    
    // Today's bills
    const due = bills
      .filter(b => {
        const billDate = new Date(b.due_date);
        return b.status === 'pending' && 
          isSameDay(billDate, today);
      })
      .slice(0, 3);
    setTodayBills(due);
  }, [bills]);

  return {
    upcomingBills,
    overdueBills,
    todayBills
  };
};
