
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { enableRealtimeForTable } from '@/integrations/supabase/realtimeHelper';

interface UseSupabaseRealtimeOptions {
  tables: string[];
  onTablesChange?: (tableName: string) => Promise<void>;
}

/**
 * Custom hook to set up Supabase realtime listeners for multiple tables
 */
export const useSupabaseRealtime = ({ 
  tables, 
  onTablesChange 
}: UseSupabaseRealtimeOptions) => {
  
  // Enable realtime for all specified tables
  useEffect(() => {
    const enableRealtime = async () => {
      for (const table of tables) {
        await enableRealtimeForTable(table);
        console.log(`Realtime enabled for table: ${table}`);
      }
    };
    
    enableRealtime();
  }, [tables]);

  // Set up channel listeners for all tables
  useEffect(() => {
    if (!onTablesChange) return;
    
    // Create a channel for each table
    const channels = tables.map(table => {
      const channelName = `${table}-changes`;
      return supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          async () => {
            console.log(`${table} table change detected, refreshing data`);
            await onTablesChange(table);
          }
        )
        .subscribe();
    });
    
    // Clean up all channels
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, onTablesChange]);
};
