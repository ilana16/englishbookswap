import { notifyNewMessage, notifyNewMatch, notifyBookAvailability } from '@/services/emailService';

/**
 * Simplified notification system that ensures emails are always sent
 * Uses user email if available and preferences allow, otherwise uses fallback
 */

const FALLBACK_EMAIL = 'ilana.cunningham16@gmail.com';

export const sendNotificationWithFallback = async (
  notificationType: 'new_messages' | 'new_matches' | 'book_availability',
  userEmail: string | null,
  shouldSend: boolean,
  userId: string
): Promise<void> => {
  try {
    // Always send notification - use user email if preferences allow, otherwise fallback
    let emailToUse = (shouldSend && userEmail) ? userEmail : FALLBACK_EMAIL;
    
    console.log(`Sending ${notificationType} notification to ${emailToUse} (user: ${userId}, shouldSend: ${shouldSend})`);
    
    // Send the appropriate notification type
    let success = false;
    switch (notificationType) {
      case 'new_messages':
        success = await notifyNewMessage(emailToUse);
        break;
      case 'new_matches':
        success = await notifyNewMatch(emailToUse);
        break;
      case 'book_availability':
        success = await notifyBookAvailability(emailToUse);
        break;
    }
    
    if (success) {
      console.log(`✅ ${notificationType} notification sent successfully to ${emailToUse} for user ${userId}`);
    } else {
      console.error(`❌ Failed to send ${notificationType} notification to ${emailToUse} for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error sending ${notificationType} notification:`, error);
  }
};

