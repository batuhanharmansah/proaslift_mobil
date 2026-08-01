// 🔴 REAL-TIME UPDATE SERVICE
// WebSocket/Pusher ile canlı güncellemeler - İş durumu değişiklikleri, konum güncellemeleri

import { API_CONFIG } from '../../constants';
import { StorageService } from '../storage/StorageService';

// ==================== TYPES ====================
export type RealtimeEventType = 
  | 'maintenance.status.changed'
  | 'maintenance.created'
  | 'maintenance.updated'
  | 'location.updated'
  | 'notification.created'
  | 'employee.status.changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: string;
}

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

// ==================== REALTIME SERVICE ====================
class RealtimeService {
  private pusher: any = null;
  private channels: Map<string, any> = new Map();
  private eventHandlers: Map<RealtimeEventType, Set<RealtimeEventHandler>> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 saniye
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private usePolling = false; // Pusher kullanılamazsa polling kullan
  private lastUpdateTime = Date.now();

  // ==================== INITIALIZE ====================
  async initialize(): Promise<void> {
    try {
      this.disconnect();

      // Pusher kullanılabilir mi kontrol et
      if (await this.canUsePusher()) {
        await this.initializePusher();
      } else {
        this.usePolling = true;
        this.startPolling();
      }
    } catch (error) {
      console.error('❌ RealtimeService initialization error:', error);
      // Hata durumunda polling'e geç
      this.usePolling = true;
      this.startPolling();
    }
  }

  private async canUsePusher(): Promise<boolean> {
    const appKey = process.env.EXPO_PUBLIC_PUSHER_APP_KEY;
    const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER;
    return !!(appKey && cluster && appKey !== 'your-app-key');
  }

  private async initializePusher(): Promise<void> {
    try {
      // Dynamic import - Pusher yüklü değilse hata vermez
      const Pusher = await import('pusher-js').catch(() => null);
      
      if (!Pusher) {
        throw new Error('Pusher not available');
      }

      const token = await StorageService.getToken();
      if (!token) {
        throw new Error('No auth token');
      }

      const appKey = process.env.EXPO_PUBLIC_PUSHER_APP_KEY || 'your-app-key';
      const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1';
      this.pusher = new Pusher.default(appKey, {
        cluster,
        authEndpoint: `${API_CONFIG.BASE_URL}/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        encrypted: true,
      });

      this.pusher.connection.bind('connected', () => {
        this.isConnected = true;
        this.usePolling = false;
        this.reconnectAttempts = 0;
        this.subscribeToChannels();
      });

      this.pusher.connection.bind('disconnected', () => {
        this.isConnected = false;
        this.attemptReconnect();
      });

      this.pusher.connection.bind('error', (error: any) => {
        console.error('❌ Pusher error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Pusher initialization error:', error);
      throw error;
    }
  }

  // ==================== CHANNELS ====================
  private async subscribeToChannels(): Promise<void> {
    if (!this.pusher || !this.isConnected) {
      return;
    }

    try {
      const token = await StorageService.getToken();
      if (!token) {
        return;
      }

      const userData = await StorageService.getUserData();
      const userId = userData?.id ?? null;
      const companyId = userData?.company_id ?? null;

      if (userId) {
        const userChannel = this.pusher.subscribe(`private-user.${userId}`);
        this.channels.set('user', userChannel);
        this.bindChannelEvents(userChannel);
      }

      if (companyId) {
        const companyChannel = this.pusher.subscribe(`private-company.${companyId}`);
        this.channels.set('company', companyChannel);
        this.bindChannelEvents(companyChannel);
      }

      // Maintenance updates channel
      const maintenanceChannel = this.pusher.subscribe('private-maintenance-updates');
      this.channels.set('maintenance', maintenanceChannel);
      this.bindChannelEvents(maintenanceChannel);

      // Location updates channel
      const locationChannel = this.pusher.subscribe('private-location-updates');
      this.channels.set('location', locationChannel);
      this.bindChannelEvents(locationChannel);

    } catch (error) {
      console.error('❌ Channel subscription error:', error);
    }
  }

  private bindChannelEvents(channel: any): void {
    // Maintenance status changed
    channel.bind('maintenance.status.changed', (data: any) => {
      this.handleEvent({
        type: 'maintenance.status.changed',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Maintenance created/updated
    channel.bind('maintenance.created', (data: any) => {
      this.handleEvent({
        type: 'maintenance.created',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    channel.bind('maintenance.updated', (data: any) => {
      this.handleEvent({
        type: 'maintenance.updated',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Location updated
    channel.bind('location.updated', (data: any) => {
      this.handleEvent({
        type: 'location.updated',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Notification created
    channel.bind('notification.created', (data: any) => {
      this.handleEvent({
        type: 'notification.created',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Employee status changed
    channel.bind('employee.status.changed', (data: any) => {
      this.handleEvent({
        type: 'employee.status.changed',
        data,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // ==================== POLLING FALLBACK ====================
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Her 30 saniyede bir güncellemeleri kontrol et (Pusher yapılandırılmadığında devreye giren yedek mekanizma;
    // gereksiz sunucu yükünü ve rate-limit riskini azaltmak için 5sn'den 30sn'ye çıkarıldı)
    this.pollingInterval = setInterval(() => {
      this.pollForUpdates();
    }, 30000);

  }

  private async pollForUpdates(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastUpdateTime < 30000) return;
      this.lastUpdateTime = now;
      const { apiClient } = await import('../api/client');
      const { API_ENDPOINTS } = await import('../../constants');
      const res = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS).catch(() => null);
      if (res?.success && res?.data) {
        this.handleEvent({
          type: 'maintenance.updated',
          data: res.data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }

  // ==================== EVENT HANDLING ====================
  private handleEvent(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`❌ Event handler error for ${event.type}:`, error);
        }
      });
    }

    // Tüm event'ler için generic handler
    const allHandlers = this.eventHandlers.get('*' as any);
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`❌ Generic event handler error:`, error);
        }
      });
    }
  }

  // ==================== PUBLIC API ====================
  on(eventType: RealtimeEventType, handler: RealtimeEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);

    // Unsubscribe function döndür
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  off(eventType: RealtimeEventType, handler: RealtimeEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  // ==================== RECONNECTION ====================
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached, using polling');
      this.usePolling = true;
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.initializePusher();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  // ==================== CLEANUP ====================
  disconnect(): void {
    // Pusher disconnect
    if (this.pusher) {
      this.channels.forEach((channel, key) => {
        if (typeof channel?.unsubscribe === 'function') {
          channel.unsubscribe();
          return;
        }

        this.pusher.unsubscribe(key);
      });
      this.channels.clear();
      this.pusher.disconnect();
      this.pusher = null;
    }

    // Polling stop
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Reconnect timer stop
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Event handlers clear
    this.eventHandlers.clear();

    this.isConnected = false;
  }

  // ==================== STATUS ====================
  getConnectionStatus(): {
    connected: boolean;
    usingPolling: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      usingPolling: this.usePolling,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
