import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface NotificationPreferences {
  new_matches: boolean;
  book_availability: boolean;
  new_messages: boolean;
}

/**
 * Get user's notification preferences from their profile
 */
export const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return {
        new_matches: data.email_notifications?.new_matches ?? true,
        book_availability: data.email_notifications?.book_availability ?? true,
        new_messages: data.email_notifications?.new_messages ?? true,
      };
    }
    
    // Default to all notifications enabled if profile doesn't exist
    return {
      new_matches: true,
      book_availability: true,
      new_messages: true,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    // Default to all notifications enabled on error
    return {
      new_matches: true,
      book_availability: true,
      new_messages: true,
    };
  }
};

/**
 * Get user's email from their profile
 */
export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return data.email || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

/**
 * Check if user should receive a specific type of notification
 */
export const shouldSendNotification = async (
  userId: string, 
  notificationType: keyof NotificationPreferences
): Promise<{ shouldSend: boolean; email: string | null }> => {
  try {
    const [preferences, email] = await Promise.all([
      getUserNotificationPreferences(userId),
      getUserEmail(userId)
    ]);
    
    const shouldSend = preferences[notificationType] && email !== null;
    
    return {
      shouldSend,
      email
    };
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return {
      shouldSend: false,
      email: null
    };
  }
};

