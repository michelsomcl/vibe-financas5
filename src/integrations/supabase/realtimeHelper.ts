
import { supabase } from './client';

/**
 * Enable real-time for a specific table
 * @param tableName - The name of the table to enable real-time for
 */
export function enableRealtimeForTable(tableName: string) {
  supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName as any }, // Fix TypeScript error with type assertion
      (payload) => {
        console.log('Change received!', payload);
      }
    )
    .subscribe((status: any) => {
      console.log('Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        console.log(`Realtime subscription established for table: ${tableName}`);
      }
    });
}

/**
 * Enable real-time for the public schema
 */
export function enableRealtimeForPublic() {
  supabase
    .channel('custom-public-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload: any) => {
        console.log('Public schema change received!', payload);
      }
    )
    .subscribe((status: any) => {
      console.log('Public schema realtime status:', status);
    });
}

/**
 * Enable real-time for all tables
 * This function enables real-time subscriptions for commonly used tables
 */
export function enableRealtimeForAllTables() {
  const tables = ['transactions', 'categories', 'accounts', 'bills'];
  tables.forEach(table => {
    enableRealtimeForTable(table);
  });
  console.log('Realtime subscriptions established for all main tables');
}
