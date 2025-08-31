import { notifyNewMessage, notifyNewMatch, notifyBookAvailability } from '@/services/emailService';

/**
 * Fallback notification system that uses a test email when user preferences fail
 * This ensures notifications still work during development and testing
 */

const FALLBACK_EMAIL = 'ilana.cunningham16@gmail.com';

export const sendNotificationWithFallback = async (
  notificationType: 'new_messages' | 'new_matches' | 'book_availability',
  userEmail: string | null,
  shouldSend: boolean,
  userId: string
): Promise<void> => {
  try {
    let emailToUse = userEmail;
    
    // If user preferences failed or email is missing, use fallback for testing
    if (!shouldSend || !userEmail) {
      console.log(`Using fallback email for ${notificationType} notification (user: ${userId})`);
      emailToUse = FALLBACK_EMAIL;
    }
    
    if (!emailToUse) {
      console.log(`No email available for ${notificationType} notification (user: ${userId})`);
      return;
    }
    
    // Send the appropriate notification type
    switch (notificationType) {
      case 'new_messages':
        await notifyNewMessage(emailToUse);
        break;
      case 'new_matches':
        await notifyNewMatch(emailToUse);
        break;
      case 'book_availability':
        await notifyBookAvailability(emailToUse);
        break;
    }
    
    console.log(`${notificationType} notification sent to ${emailToUse} for user ${userId}`);
  } catch (error) {
    console.error(`Error sending ${notificationType} notification:`, error);
  }
};

