/*
┌───────────────────────────────────────────────────────────────────────┐
│  Notification Queue Worker - Service 2                                │
│  Background processor for queued notifications                        │
└───────────────────────────────────────────────────────────────────────┘
*/

import { notificationQueue, QueuedNotification } from '../Services/notificationQueue.Service.js';
import { notificationClient } from '../Utils/notificationClient.js';

// ============================================================================
// QUEUE PROCESSOR
// ============================================================================

/**
 * Process a single queued notification
 */
async function processQueuedNotification(notification: QueuedNotification): Promise<void> {
  console.log(`🔄 Processing queued notification: ${notification.id} (attempt ${notification.attempts + 1})`);

  try {
    let result;

    switch (notification.type) {
      case 'single':
        if (!notification.fcmToken) throw new Error('Missing FCM token');
        result = await notificationClient.sendNotification({
          fcmToken: notification.fcmToken,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        break;

      case 'user':
        if (!notification.userId) throw new Error('Missing userId');
        result = await notificationClient.sendToUser({
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        break;

      case 'users':
        if (!notification.userIds || notification.userIds.length === 0) {
          throw new Error('Missing userIds');
        }
        result = await notificationClient.sendToUsers({
          userIds: notification.userIds,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        break;

      case 'bulk':
        if (!notification.userIds || notification.userIds.length === 0) {
          throw new Error('Missing userIds');
        }
        result = await notificationClient.sendBulkNotifications({
          userIds: notification.userIds,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        break;

      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }

    if (!result.success && !result.queued) {
      // If it failed but wasn't re-queued, throw error to trigger retry
      throw new Error(result.error || 'Unknown error');
    }

    console.log(`✅ Successfully processed queued notification: ${notification.id}`);
  } catch (error: any) {
    console.error(`❌ Failed to process notification ${notification.id}:`, error.message);
    throw error; // Re-throw to trigger retry logic
  }
}

/**
 * Start the notification queue worker
 */
export async function startNotificationWorker(): Promise<void> {
  console.log('🚀 Starting notification queue worker...');

  try {
    // Start processing queue
    await notificationQueue.startProcessing(processQueuedNotification);

    // Log stats every 30 seconds
    setInterval(async () => {
      const stats = await notificationQueue.getStats();
      // console.log(
      //   `📊 Queue stats - Queue: ${stats.queueSize}, Processing: ${stats.processingSize}, Failed: ${stats.failedSize}`
      // );
    }, 30000);

    console.log('✅ Notification queue worker started successfully');
  } catch (error) {
    console.error('❌ Failed to start notification queue worker:', error);
    throw error;
  }
}

/**
 * Stop the notification queue worker
 */
export function stopNotificationWorker(): void {
  console.log('⏸️ Stopping notification queue worker...');
  notificationQueue.stopProcessing();
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping queue worker...');
  stopNotificationWorker();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping queue worker...');
  stopNotificationWorker();
});
