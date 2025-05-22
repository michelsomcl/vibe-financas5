
import { supabase } from './client';

/**
 * Enables real-time updates for a specific table
 */
export const enableRealtimeForTable = async (tableName: string): Promise<void> => {
  try {
    // Using type assertion to handle the RPC call
    const { error } = await supabase.rpc(
      'enable_realtime',
      { table_name: tableName }
    ) as any;
    
    if (error) throw error;
    console.log(`Real-time enabled for table: ${tableName}`);
  } catch (error) {
    console.error(`Error enabling real-time for table ${tableName}:`, error);
  }
};

/**
 * Creates a stored procedure in PostgreSQL to enable real-time for tables
 */
export const createRealtimeProcedure = async (): Promise<void> => {
  try {
    // Using type assertion to handle the RPC call
    const { error } = await supabase.rpc(
      'create_realtime_procedure'
    ) as any;
    
    if (error) throw error;
    console.log('Real-time procedure created successfully');
  } catch (error) {
    console.log('Real-time procedure might already exist:', error);
  }
};

/**
 * Enables real-time updates for all financial tables
 */
export const enableRealtimeForAllTables = async (): Promise<void> => {
  const tables = ['transactions', 'accounts', 'bills', 'categories'];
  
  for (const table of tables) {
    await enableRealtimeForTable(table);
  }
  
  console.log('Real-time enabled for all tables');
};
