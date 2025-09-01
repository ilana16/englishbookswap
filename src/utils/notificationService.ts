import { notifyNewMessage, notifyNewMatch, notifyBookAvailability } from '@/services/emailService';

/**
 * Notification system that respects user preferences
 * Only sends emails when users have explicitly enabled notifications
 */

export const sendNotificationWithFallback = async (
  notificationType: 'new_messages' | 'new_matches' | 'book_availability',
  userEmail: string | null,
  shouldSend: boolean,
  userId: string
): Promise<void> => {
  try {
    console.log(`Checking ${notificationType} notification for user ${userId}: shouldSend=${shouldSend}, email=${userEmail}`);
    
    // Respect user preferences - if they disabled notifications, don't send anything
    if (!shouldSend) {
      console.log(`🚫 User ${userId} has disabled ${notificationType} notifications - respecting their choice`);
      return;
    }
    
    // If user wants notifications but has no email, we can't send
    if (!userEmail) {
      console.log(`⚠️ User ${userId} wants ${notificationType} notifications but has no email address`);
      return;
    }
    
    console.log(`📧 Sending ${notificationType} notification to ${userEmail} for user ${userId}`);
    
    // Send the appropriate notification type
    let success = false;
    switch (notificationType) {
      case 'new_messages':
        success = await notifyNewMessage(userEmail);
        break;
      case 'new_matches':
        success = await notifyNewMatch(userEmail);
        break;
      case 'book_availability':
        success = await notifyBookAvailability(userEmail);
        break;
    }
    
    if (success) {
      console.log(`✅ ${notificationType} notification sent successfully to ${userEmail} for user ${userId}`);
    } else {
      console.error(`❌ Failed to send ${notificationType} notification to ${userEmail} for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error sending ${notificationType} notification:`, error);
  }
};

