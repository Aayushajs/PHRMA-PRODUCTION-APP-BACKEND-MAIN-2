/*
┌───────────────────────────────────────────────────────────────────────┐
│  Notification Queue Service - Service 2                               │
│  FIFO Queue for failed notifications with retry mechanism             │
│  Uses Redis for persistent queue storage                              │
└───────────────────────────────────────────────────────────────────────┘
*/

import { redis } from '../config/redis';

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedNotification {
  id: string;
  userId?: string;      // For single user notification
  fcmToken?: string;    // For single FCM token notification
  userIds?: string[];   // For bulk user notifications
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'single' | 'bulk' | 'user' | 'users';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

// ============================================================================
// NOTIFICATION QUEUE CLASS
// ============================================================================

class NotificationQueue {
  private readonly QUEUE_KEY = 'notification:queue';
  private readonly PROCESSING_KEY = 'notification:processing';
  private readonly FAILED_KEY = 'notification:failed';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private isProcessing = false;

  /**
   * Add notification to queue
   */
  async enqueue(notification: Omit<QueuedNotification, 'id' | 'attempts' | 'createdAt'>): Promise<string> {
    try {
      const queuedNotification: QueuedNotification = {
        ...notification,
        id: this.generateId(),
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      await redis.rPush(this.QUEUE_KEY, JSON.stringify(queuedNotification));
      console.log(`📥 Queued notification: ${queuedNotification.id}`);
      
      return queuedNotification.id;
    } catch (error: any) {
      console.error('❌ Failed to enqueue notification:', error);
      throw error;
    }
  }

  /**
   * Get next notification from queue (FIFO)
   */
  async dequeue(): Promise<QueuedNotification | null> {
    try {
      // Move from queue to processing (atomic operation)
      const data = await redis.lMove(this.QUEUE_KEY, this.PROCESSING_KEY, 'LEFT', 'RIGHT');
      
      if (!data) return null;

      const notification: QueuedNotification = JSON.parse(data);
      return notification;
    } catch (error: any) {
      console.error('❌ Failed to dequeue notification:', error);
      return null;
    }
  }

  /**
   * Mark notification as successfully processed
   */
  async markAsCompleted(notificationId: string): Promise<void> {
    try {
      // Remove from processing list
      const processingList = await redis.lRange(this.PROCESSING_KEY, 0, -1);
      
      for (let i = 0; i < processingList.length; i++) {
        const item = processingList[i];
        if (!item) continue;
        const notification: QueuedNotification = JSON.parse(item);
        if (notification.id === notificationId) {
          await redis.lRem(this.PROCESSING_KEY, 1, item);
          console.log(`✅ Notification ${notificationId} completed`);
          break;
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to mark notification as completed:', error);
    }
  }

  /**
   * Retry notification (re-queue or move to failed)
   */
  async retry(notification: QueuedNotification, error: string): Promise<void> {
    try {
      notification.attempts++;
      notification.lastAttemptAt = new Date().toISOString();
      notification.error = error;

      // Remove from processing
      const processingList = await redis.lRange(this.PROCESSING_KEY, 0, -1);
      for (let i = 0; i < processingList.length; i++) {
        const elem = processingList[i];
        if (!elem) continue;
        const item: QueuedNotification = JSON.parse(elem);
        if (item.id === notification.id) {
          await redis.lRem(this.PROCESSING_KEY, 1, elem);
          break;
        }
      }

      if (notification.attempts < notification.maxAttempts) {
        // Re-queue for retry
        await redis.rPush(this.QUEUE_KEY, JSON.stringify(notification));
        console.log(`🔄 Notification ${notification.id} requeued (attempt ${notification.attempts}/${notification.maxAttempts})`);
      } else {
        // Move to failed queue
        await redis.rPush(this.FAILED_KEY, JSON.stringify(notification));
        console.error(`❌ Notification ${notification.id} failed after ${notification.attempts} attempts`);
      }
    } catch (error: any) {
      console.error('❌ Failed to retry notification:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    queueSize: number;
    processingSize: number;
    failedSize: number;
  }> {
    try {
      const [queueSize, processingSize, failedSize] = await Promise.all([
        redis.lLen(this.QUEUE_KEY),
        redis.lLen(this.PROCESSING_KEY),
        redis.lLen(this.FAILED_KEY),
      ]);

      return { queueSize, processingSize, failedSize };
    } catch (error: any) {
      console.error('❌ Failed to get queue stats:', error);
      return { queueSize: 0, processingSize: 0, failedSize: 0 };
    }
  }

  /**
   * Get failed notifications
   */
  async getFailedNotifications(limit: number = 100): Promise<QueuedNotification[]> {
    try {
      const failedList = await redis.lRange(this.FAILED_KEY, 0, limit - 1);
      return failedList.map(item => JSON.parse(item));
    } catch (error: any) {
      console.error('❌ Failed to get failed notifications:', error);
      return [];
    }
  }

  /**
   * Clear failed notifications
   */
  async clearFailed(): Promise<void> {
    try {
      await redis.del(this.FAILED_KEY);
      console.log('🗑️ Cleared failed notifications');
    } catch (error: any) {
      console.error('❌ Failed to clear failed notifications:', error);
    }
  }

  /**
   * Recover stuck notifications in processing state
   */
  async recoverStuckNotifications(): Promise<void> {
    try {
      const processingList = await redis.lRange(this.PROCESSING_KEY, 0, -1);
      
      for (const item of processingList) {
        const notification: QueuedNotification = JSON.parse(item);
        
        // If notification has been processing for more than 5 minutes, re-queue it
        const lastAttempt = notification.lastAttemptAt || notification.createdAt;
        const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();
        
        if (timeSinceLastAttempt > 5 * 60 * 1000) { // 5 minutes
          console.log(`🔧 Recovering stuck notification: ${notification.id}`);
          await this.retry(notification, 'Stuck in processing state');
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to recover stuck notifications:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start processing queue (background worker)
   */
  async startProcessing(processFn: (notification: QueuedNotification) => Promise<void>): Promise<void> {
    if (this.isProcessing) {
      console.warn('⚠️ Queue processing already running');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Started notification queue processor');

    // Recover any stuck notifications first
    await this.recoverStuckNotifications();

    const process = async () => {
      while (this.isProcessing) {
        try {
          const notification = await this.dequeue();
          
          if (!notification) {
            // No notifications in queue, wait before checking again
            await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
            continue;
          }

          console.log(`📤 Processing notification: ${notification.id}`);
          
          try {
            await processFn(notification);
            await this.markAsCompleted(notification.id);
          } catch (error: any) {
            console.error(`❌ Failed to process notification ${notification.id}:`, error.message);
            await this.retry(notification, error.message);
          }

          // Small delay between processing
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error('❌ Queue processing error:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    process().catch(error => {
      console.error('❌ Fatal queue processing error:', error);
      this.isProcessing = false;
    });
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    this.isProcessing = false;
    console.log('⏸️ Stopped notification queue processor');
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const notificationQueue = new NotificationQueue();
