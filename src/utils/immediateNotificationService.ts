import { notifyNewMessageImmediate, notifyNewMatchImmediate, notifyBookAvailabilityImmediate } from '@/services/enhancedEmailService';

/**
 * Immediate notification system with enhanced reliability and user preference respect
 * Ensures immediate delivery while respecting user choices
 */

export const sendImmediateNotification = async (
  notificationType: 'new_messages' | 'new_matches' | 'book_availability',
  userEmail: string | null,
  shouldSend: boolean,
  userId: string,
  additionalContext?: any
): Promise<boolean> => {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 IMMEDIATE NOTIFICATION: ${notificationType} for user ${userId}`);
    console.log(`📋 Context: shouldSend=${shouldSend}, email=${userEmail}, timestamp=${new Date().toISOString()}`);
    
    // Respect user preferences - if they disabled notifications, don't send anything
    if (!shouldSend) {
      console.log(`🚫 User ${userId} has disabled ${notificationType} notifications - respecting their choice`);
      return false;
    }
    
    // If user wants notifications but has no email, we can't send
    if (!userEmail) {
      console.error(`⚠️ User ${userId} wants ${notificationType} notifications but has no email address`);
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      console.error(`❌ Invalid email format for user ${userId}: ${userEmail}`);
      return false;
    }
    
    console.log(`📧 SENDING IMMEDIATE ${notificationType} notification to ${userEmail} for user ${userId}`);
    
    // Send the appropriate notification type with immediate delivery
    let success = false;
    switch (notificationType) {
      case 'new_messages':
        success = await notifyNewMessageImmediate(userEmail);
        break;
      case 'new_matches':
        success = await notifyNewMatchImmediate(userEmail);
        break;
      case 'book_availability':
        success = await notifyBookAvailabilityImmediate(userEmail);
        break;
      default:
        console.error(`❌ Unknown notification type: ${notificationType}`);
        return false;
    }
    
    const duration = Date.now() - startTime;
    
    if (success) {
      console.log(`✅ IMMEDIATE ${notificationType} notification sent successfully to ${userEmail} for user ${userId} in ${duration}ms`);
      
      // Log success metrics
      console.log(`📊 SUCCESS METRICS: type=${notificationType}, user=${userId}, email=${userEmail}, duration=${duration}ms, timestamp=${new Date().toISOString()}`);
      
      return true;
    } else {
      console.error(`❌ FAILED to send IMMEDIATE ${notificationType} notification to ${userEmail} for user ${userId} after ${duration}ms`);
      
      // Log failure metrics
      console.log(`📊 FAILURE METRICS: type=${notificationType}, user=${userId}, email=${userEmail}, duration=${duration}ms, timestamp=${new Date().toISOString()}`);
      
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 CRITICAL ERROR sending IMMEDIATE ${notificationType} notification for user ${userId} after ${duration}ms:`, error);
    
    // Log critical error metrics
    console.log(`📊 ERROR METRICS: type=${notificationType}, user=${userId}, email=${userEmail}, duration=${duration}ms, error=${error}, timestamp=${new Date().toISOString()}`);
    
    return false;
  }
};

/**
 * Queue-based notification system for high-volume scenarios
 */
class NotificationQueue {
  private queue: Array<{
    id: string;
    type: string;
    email: string;
    userId: string;
    timestamp: number;
    retries: number;
  }> = [];
  
  private processing = false;
  private maxRetries = 3;
  private processingDelay = 100; // ms between notifications
  
  async addToQueue(
    notificationType: 'new_messages' | 'new_matches' | 'book_availability',
    userEmail: string,
    userId: string
  ): Promise<void> {
    const notification = {
      id: `${userId}-${notificationType}-${Date.now()}`,
      type: notificationType,
      email: userEmail,
      userId,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(notification);
    console.log(`📥 Added to notification queue: ${notification.id} (queue size: ${this.queue.length})`);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    console.log(`🔄 Processing notification queue (${this.queue.length} items)`);
    
    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;
      
      try {
        let success = false;
        switch (notification.type) {
          case 'new_messages':
            success = await notifyNewMessageImmediate(notification.email);
            break;
          case 'new_matches':
            success = await notifyNewMatchImmediate(notification.email);
            break;
          case 'book_availability':
            success = await notifyBookAvailabilityImmediate(notification.email);
            break;
        }
        
        if (success) {
          console.log(`✅ Queue processed: ${notification.id}`);
        } else {
          notification.retries++;
          if (notification.retries < this.maxRetries) {
            console.log(`🔄 Retrying notification: ${notification.id} (attempt ${notification.retries + 1})`);
            this.queue.unshift(notification); // Add back to front for retry
          } else {
            console.error(`❌ Max retries exceeded for: ${notification.id}`);
          }
        }
      } catch (error) {
        console.error(`💥 Error processing notification ${notification.id}:`, error);
      }
      
      // Small delay between notifications to prevent overwhelming the service
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }
    
    this.processing = false;
    console.log(`✅ Notification queue processing complete`);
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueue();

/**
 * High-priority immediate notification (bypasses queue)
 */
export const sendHighPriorityNotification = async (
  notificationType: 'new_messages' | 'new_matches' | 'book_availability',
  userEmail: string,
  userId: string
): Promise<boolean> => {
  console.log(`🚨 HIGH PRIORITY: ${notificationType} notification for user ${userId}`);
  
  // Skip user preference check for high priority notifications
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    console.error(`❌ Invalid email format for high priority notification: ${userEmail}`);
    return false;
  }
  
  return await sendImmediateNotification(notificationType, userEmail, true, userId);
};

