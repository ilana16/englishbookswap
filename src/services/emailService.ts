import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

// Simple email notification service with exact messages as specified
export const sendEmailNotification = async (
  recipientEmail: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    // Write to mail collection - Firebase extension will automatically send the email
    const mailDoc = {
      to: [recipientEmail],
      message: {
        subject: subject,
        text: message,
        html: `<p>${message}</p>`
      },
      created_at: serverTimestamp()
    };
    
    await addDoc(collection(db, 'mail'), mailDoc);
    console.log(`Email notification sent to: ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

// 1. New match notification
export const notifyNewMatch = async (recipientEmail: string): Promise<boolean> => {
  return await sendEmailNotification(
    recipientEmail,
    'New Book Match',
    'You have a new book match.'
  );
};

// 2. Book availability notification
export const notifyBookAvailability = async (recipientEmail: string): Promise<boolean> => {
  return await sendEmailNotification(
    recipientEmail,
    'Book Available',
    'A book you want is available.'
  );
};

// 3. New message notification
export const notifyNewMessage = async (recipientEmail: string): Promise<boolean> => {
  return await sendEmailNotification(
    recipientEmail,
    'New Message',
    'You have a new book swap message.'
  );
};

