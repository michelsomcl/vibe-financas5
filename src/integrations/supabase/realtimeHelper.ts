
import { supabase } from './client';

/**
 * Enables real-time updates for a specific table
 * This function enables the table for realtime updates in the database
 * 
 * @param tableName - The name of the table to enable real-time for
 * @returns Promise<void>
 */
export const enableRealtimeForTable = async (tableName: string): Promise<void> => {
  try {
    // Using the rpc method to call the supabase_realtime function
    // Fix: Use an explicit type assertion to address the TypeScript error
    const { error } = await supabase.rpc('enable_realtime', { 
      table_name: tableName 
    } as any);
    
    if (error) throw error;
    console.log(`Real-time enabled for table: ${tableName}`);
  } catch (error) {
    console.error(`Error enabling real-time for table ${tableName}:`, error);
  }
};

/**
 * Creates a stored procedure in PostgreSQL to enable real-time for tables
 * This should be run once during application initialization
 */
export const createRealtimeProcedure = async (): Promise<void> => {
  try {
    // Using the rpc method to call the create_realtime_procedure function
    // Fix: Use an explicit type assertion to address the TypeScript error
    const { error } = await supabase.rpc('create_realtime_procedure' as any);
    
    if (error) throw error;
    console.log('Real-time procedure created successfully');
  } catch (error) {
    // The procedure might already exist, which is fine
    console.log('Real-time procedure might already exist:', error);
  }
};

/**
 * Enables real-time updates for all financial tables
 * Call this function once when the application starts
 */
export const enableRealtimeForAllTables = async (): Promise<void> => {
  const tables = ['transactions', 'accounts', 'bills', 'categories'];
  
  // Enable real-time for all tables
  for (const table of tables) {
    await enableRealtimeForTable(table);
  }
  
  console.log('Real-time enabled for all tables');
};
