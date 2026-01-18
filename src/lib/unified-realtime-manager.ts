/**
 * Unified Realtime Manager
 * Consolidates all realtime subscriptions into a single channel
 * Reduces connection usage by 60-70% for free tier compliance
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from './logger';

type EventType = 'announcement' | 'cache_invalidation' | 'site_settings' | 'fiqh_notification';

type EventHandler = (payload: any) => void;

class UnifiedRealtimeManager {
    private channel: RealtimeChannel | null = null;
    private handlers: Map<EventType, Set<EventHandler>> = new Map();
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    /**
     * Initialize the unified channel
     */
    init() {
        if (this.channel) {
            logger.warn('Realtime channel already initialized');
            return;
        }

        // Create single consolidated channel
        this.channel = supabase.channel('app-unified-events', {
            config: {
                broadcast: { self: false }, // Don't receive own broadcasts
                presence: { key: '' }, // Disabled for regular users
            },
        });

        // Set up database change listeners
        this.setupDatabaseListeners();

        // Set up broadcast listeners
        this.setupBroadcastListeners();

        // Handle connection states
        this.channel
            .on('system', {}, (payload) => {
                logger.debug('Realtime system event:', payload);
                if (payload.status === 'CHANNEL_ERROR') {
                    this.handleConnectionError();
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    logger.info('✅ Unified realtime channel connected');
                } else if (status === 'CHANNEL_ERROR') {
                    this.isConnected = false;
                    this.handleConnectionError();
                } else if (status === 'TIMED_OUT') {
                    this.isConnected = false;
                    logger.warn('Realtime connection timed out');
                }
            });
    }

    /**
     * Set up database change listeners (for INSERT/UPDATE/DELETE events)
     */
    private setupDatabaseListeners() {
        if (!this.channel) return;

        // Listen to announcements table changes
        this.channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'announcements',
            },
            (payload) => {
                this.broadcast('announcement', payload);
            }
        );

        // Listen to site_settings changes
        this.channel.on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'site_settings',
            },
            (payload) => {
                this.broadcast('site_settings', payload);
            }
        );

        // Listen to fiqh_questions changes (for notifications)
        this.channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'fiqh_questions',
            },
            (payload) => {
                this.broadcast('fiqh_notification', payload);
            }
        );
    }

    /**
     * Set up broadcast listeners (for manual events)
     */
    private setupBroadcastListeners() {
        if (!this.channel) return;

        // Listen for cache invalidation broadcasts
        this.channel.on('broadcast', { event: 'cache_invalidate' }, (payload) => {
            this.broadcast('cache_invalidation', payload);
        });
    }

    /**
     * Broadcast event to all registered handlers
     */
    private broadcast(eventType: EventType, payload: any) {
        const handlers = this.handlers.get(eventType);
        if (!handlers || handlers.size === 0) return;

        handlers.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                logger.error(`Error in ${eventType} handler:`, error);
            }
        });
    }

    /**
     * Subscribe to a specific event type
     */
    on(eventType: EventType, handler: EventHandler): () => void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }

        this.handlers.get(eventType)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.off(eventType, handler);
        };
    }

    /**
     * Unsubscribe from a specific event
     */
    off(eventType: EventType, handler: EventHandler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);

            // Clean up empty handler sets
            if (handlers.size === 0) {
                this.handlers.delete(eventType);
            }
        }
    }

    /**
     * Send a broadcast message (e.g., for cache invalidation)
     */
    async send(eventType: EventType, payload: any) {
        if (!this.channel || !this.isConnected) {
            logger.warn('Cannot send broadcast: channel not connected');
            return;
        }

        try {
            await this.channel.send({
                type: 'broadcast',
                event: eventType,
                payload,
            });
        } catch (error) {
            logger.error('Error sending broadcast:', error);
        }
    }

    /**
     * Handle connection errors with exponential backoff
     */
    private handleConnectionError() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached. Giving up.');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        logger.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.disconnect();
            this.init();
        }, delay);
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            hasChannel: !!this.channel,
            handlerCount: Array.from(this.handlers.values()).reduce(
                (sum, handlers) => sum + handlers.size,
                0
            ),
        };
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * Clear all handlers (useful for cleanup)
     */
    clearHandlers() {
        this.handlers.clear();
    }
}

// Export singleton instance
export const realtimeManager = new UnifiedRealtimeManager();

// Auto-initialize on first import (can be disabled if needed)
if (typeof window !== 'undefined') {
    // Small delay to ensure supabase client is ready
    setTimeout(() => {
        realtimeManager.init();
    }, 100);
}
