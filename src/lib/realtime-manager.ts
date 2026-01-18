import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'announcements' | 'site_settings' | 'pieces' | 'categories' | 'imams' | 'fiqh_questions';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type Callback<T = any> = (payload: RealtimePostgresChangesPayload<T>) => void;

interface Subscription {
  id: string;
  table: TableName;
  event: EventType;
  callback: Callback;
  filter?: string;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private channel: RealtimeChannel | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private buildChannel(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase.channel('unified-realtime-channel', {
      config: {
        presence: { key: 'user' },
      },
    });

    const tables = new Set<TableName>();
    this.subscriptions.forEach((sub) => tables.add(sub.table));

    tables.forEach((table) => {
      const tableSubscriptions = Array.from(this.subscriptions.values()).filter(
        (s) => s.table === table
      );

      const events = new Set(tableSubscriptions.map((s) => s.event));
      
      events.forEach((event) => {
        this.channel!.on(
          'postgres_changes' as any,
          {
            event: event === '*' ? '*' : event,
            schema: 'public',
            table,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handlePayload(table, payload);
          }
        );
      });
    });

    this.channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.debug('Unified realtime channel connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          this.handleDisconnect();
        }
      });
  }

  private handlePayload(table: TableName, payload: RealtimePostgresChangesPayload<any>): void {
    this.subscriptions.forEach((sub) => {
      if (sub.table !== table) return;
      if (sub.event !== '*' && sub.event !== payload.eventType) return;
      
      try {
        sub.callback(payload);
      } catch (error) {
        logger.error(`Error in realtime callback for ${table}:`, error);
      }
    });
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      logger.warn(`Realtime disconnected, reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.subscriptions.size > 0) {
          this.buildChannel();
        }
      }, delay);
    } else {
      logger.error('Max reconnect attempts reached for realtime channel');
    }
  }

  subscribe<T = any>(
    table: TableName,
    event: EventType,
    callback: Callback<T>,
    filter?: string
  ): string {
    const id = `${table}-${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(id, {
      id,
      table,
      event,
      callback,
      filter,
    });

    if (!this.isConnected || this.needsRebuild()) {
      this.buildChannel();
    }

    return id;
  }

  unsubscribe(id: string): void {
    this.subscriptions.delete(id);

    if (this.subscriptions.size === 0 && this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isConnected = false;
    } else if (this.needsRebuild()) {
      this.buildChannel();
    }
  }

  private needsRebuild(): boolean {
    return false;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getConnectedTables(): TableName[] {
    const tables = new Set<TableName>();
    this.subscriptions.forEach((sub) => tables.add(sub.table));
    return Array.from(tables);
  }

  isChannelConnected(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscriptions.clear();
    this.isConnected = false;
  }
}

export const realtimeManager = RealtimeManager.getInstance();

export function useRealtimeSubscription<T = any>(
  table: TableName,
  event: EventType,
  callback: Callback<T>,
  enabled = true
): void {
  const { useEffect, useRef, useCallback } = require('react');
  
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    callbackRef.current(payload);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const subscriptionId = realtimeManager.subscribe(table, event, stableCallback);

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [table, event, stableCallback, enabled]);
}
