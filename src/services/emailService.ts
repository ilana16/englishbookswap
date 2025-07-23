import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface EmailNotification {
  id?: string;
  recipient_email: string;
  recipient_name: string;
  template_type: 'new_match' | 'book_availability' | 'new_message';
  template_data: any;
  status: 'pending' | 'sent' | 'failed';
  created_at: any;
  sent_at?: any;
  error_message?: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: {
    new_matches: boolean;
    book_availability: boolean;
    new_messages: boolean;
  };
  created_at: any;
  updated_at: any;
}

// Email templates
const EMAIL_TEMPLATES = {
  new_match: {
    subject: (data: any) => `📚 Great news! Someone wants your book "${data.bookTitle}"`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📚 Book Match Found!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            Hello ${data.ownerName},
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Exciting news! <strong>${data.requesterName}</strong> is interested in your book:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">"${data.bookTitle}"</h3>
            <p style="margin: 0; color: #666;">by ${data.bookAuthor}</p>
          </div>
          ${data.message ? `
            <p style="font-size: 16px; color: #555;">
              <strong>Message from ${data.requesterName}:</strong>
            </p>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic;">
              "${data.message}"
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.chatUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Start Conversation
            </a>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            Happy reading! 📖<br>
            The English Book Swap Team
          </p>
        </div>
      </div>
    `
  },
  book_availability: {
    subject: (data: any) => `📚 Your wanted book "${data.bookTitle}" is now available!`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Book Available!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            Hello ${data.seekerName},
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Great news! A book from your wishlist is now available:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="margin: 0 0 10px 0; color: #333;">"${data.bookTitle}"</h3>
            <p style="margin: 0; color: #666;">by ${data.bookAuthor}</p>
            <p style="margin: 10px 0 0 0; color: #666;">Available from: <strong>${data.ownerName}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Condition: <strong>${data.condition}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Neighborhood: <strong>${data.neighborhood}</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.bookUrl}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Request This Book
            </a>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            Don't wait too long - popular books go fast! 📚<br>
            The English Book Swap Team
          </p>
        </div>
      </div>
    `
  },
  new_message: {
    subject: (data: any) => `💬 New message from ${data.senderName}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B6B 0%, #ee5a52 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">💬 New Message</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            Hello ${data.recipientName},
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            You have a new message from <strong>${data.senderName}</strong>:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B6B;">
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.5;">
              "${data.messageContent}"
            </p>
          </div>
          ${data.bookTitle ? `
            <p style="font-size: 14px; color: #666; margin: 15px 0;">
              <strong>About:</strong> "${data.bookTitle}"
            </p>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.chatUrl}" style="background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Reply Now
            </a>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            Keep the conversation going! 💬<br>
            The English Book Swap Team
          </p>
        </div>
      </div>
    `
  }
};

// Get user's email from their profile
export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const profileDoc = await getDoc(doc(db, 'profiles', userId));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      return profileData.email || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

// Get user's notification preferences
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  try {
    const prefsQuery = query(
      collection(db, 'notification_preferences'),
      where('user_id', '==', userId)
    );
    const querySnapshot = await getDocs(prefsQuery);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as NotificationPreferences;
    }
    
    // Return default preferences if none exist
    return {
      user_id: userId,
      email_notifications: {
        new_matches: true,
        book_availability: true,
        new_messages: true
      },
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
};

// Queue an email notification
export const queueEmailNotification = async (
  recipientUserId: string,
  templateType: 'new_match' | 'book_availability' | 'new_message',
  templateData: any
): Promise<string | null> => {
  try {
    // Get user's email and preferences
    const userEmail = await getUserEmail(recipientUserId);
    if (!userEmail) {
      console.log('No email found for user:', recipientUserId);
      return null;
    }

    const preferences = await getNotificationPreferences(recipientUserId);
    if (!preferences) {
      console.log('No preferences found for user:', recipientUserId);
      return null;
    }

    // Check if user wants this type of notification
    const wantsNotification = 
      (templateType === 'new_match' && preferences.email_notifications.new_matches) ||
      (templateType === 'book_availability' && preferences.email_notifications.book_availability) ||
      (templateType === 'new_message' && preferences.email_notifications.new_messages);

    if (!wantsNotification) {
      console.log(`User ${recipientUserId} has disabled ${templateType} notifications`);
      return null;
    }

    // Get recipient name from profile
    const profileDoc = await getDoc(doc(db, 'profiles', recipientUserId));
    const recipientName = profileDoc.exists() 
      ? (profileDoc.data().display_name || profileDoc.data().username || 'Book Lover')
      : 'Book Lover';

    const emailNotification: Omit<EmailNotification, 'id'> = {
      recipient_email: userEmail,
      recipient_name: recipientName,
      template_type: templateType,
      template_data: templateData,
      status: 'pending',
      created_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'email_notifications'), emailNotification);
    console.log('Email notification queued:', docRef.id);
    
    // In a real implementation, this would trigger a cloud function or background job
    // For now, we'll simulate sending the email immediately
    await sendEmailNotification(docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error queueing email notification:', error);
    return null;
  }
};

// Send an email notification (simulated)
export const sendEmailNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationDoc = await getDoc(doc(db, 'email_notifications', notificationId));
    if (!notificationDoc.exists()) {
      console.error('Notification not found:', notificationId);
      return false;
    }

    const notification = notificationDoc.data() as EmailNotification;
    const template = EMAIL_TEMPLATES[notification.template_type];
    
    if (!template) {
      console.error('Template not found for type:', notification.template_type);
      return false;
    }

    const subject = template.subject(notification.template_data);
    const htmlContent = template.html(notification.template_data);

    // In a real implementation, this would use a service like SendGrid, Nodemailer, etc.
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', notification.recipient_email);
    console.log('Subject:', subject);
    console.log('HTML Content:', htmlContent);
    console.log('========================');

    // Update notification status to sent
    // In a real implementation, you would update the document in Firestore
    console.log('Email notification sent successfully:', notificationId);
    
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

// Trigger new match notification
export const notifyNewMatch = async (
  ownerId: string,
  requesterId: string,
  bookId: string,
  bookTitle: string,
  bookAuthor: string,
  message?: string
): Promise<void> => {
  try {
    // Get user names
    const [ownerDoc, requesterDoc] = await Promise.all([
      getDoc(doc(db, 'profiles', ownerId)),
      getDoc(doc(db, 'profiles', requesterId))
    ]);

    const ownerName = ownerDoc.exists() 
      ? (ownerDoc.data().display_name || ownerDoc.data().username || 'Book Owner')
      : 'Book Owner';
    
    const requesterName = requesterDoc.exists()
      ? (requesterDoc.data().display_name || requesterDoc.data().username || 'Book Seeker')
      : 'Book Seeker';

    // Notify book owner
    await queueEmailNotification(ownerId, 'new_match', {
      ownerName,
      requesterName,
      bookTitle,
      bookAuthor,
      message,
      chatUrl: `${window.location.origin}/chat/${ownerId}-${requesterId}`
    });

    console.log('New match notification sent to book owner');
  } catch (error) {
    console.error('Error sending new match notification:', error);
  }
};

// Trigger book availability notification
export const notifyBookAvailability = async (
  bookId: string,
  bookTitle: string,
  bookAuthor: string,
  ownerId: string,
  condition: string,
  neighborhood: string
): Promise<void> => {
  try {
    // Find users who want this book
    const wantedBooksQuery = query(
      collection(db, 'wanted_books'),
      where('title', '==', bookTitle),
      where('author', '==', bookAuthor)
    );
    
    const wantedBooksSnapshot = await getDocs(wantedBooksQuery);
    
    // Get owner name
    const ownerDoc = await getDoc(doc(db, 'profiles', ownerId));
    const ownerName = ownerDoc.exists()
      ? (ownerDoc.data().display_name || ownerDoc.data().username || 'Book Owner')
      : 'Book Owner';

    // Notify each user who wants this book
    for (const wantedBookDoc of wantedBooksSnapshot.docs) {
      const wantedBook = wantedBookDoc.data();
      const seekerId = wantedBook.user_id;
      
      // Don't notify the owner themselves
      if (seekerId === ownerId) continue;

      const seekerDoc = await getDoc(doc(db, 'profiles', seekerId));
      const seekerName = seekerDoc.exists()
        ? (seekerDoc.data().display_name || seekerDoc.data().username || 'Book Seeker')
        : 'Book Seeker';

      await queueEmailNotification(seekerId, 'book_availability', {
        seekerName,
        bookTitle,
        bookAuthor,
        ownerName,
        condition,
        neighborhood,
        bookUrl: `${window.location.origin}/browse?book=${bookId}`
      });
    }

    console.log('Book availability notifications sent');
  } catch (error) {
    console.error('Error sending book availability notifications:', error);
  }
};

// Trigger new message notification
export const notifyNewMessage = async (
  chatId: string,
  senderId: string,
  recipientId: string,
  messageContent: string,
  bookTitle?: string
): Promise<void> => {
  try {
    // Get sender and recipient names
    const [senderDoc, recipientDoc] = await Promise.all([
      getDoc(doc(db, 'profiles', senderId)),
      getDoc(doc(db, 'profiles', recipientId))
    ]);

    const senderName = senderDoc.exists()
      ? (senderDoc.data().display_name || senderDoc.data().username || 'Book Swapper')
      : 'Book Swapper';
    
    const recipientName = recipientDoc.exists()
      ? (recipientDoc.data().display_name || recipientDoc.data().username || 'Book Lover')
      : 'Book Lover';

    await queueEmailNotification(recipientId, 'new_message', {
      senderName,
      recipientName,
      messageContent,
      bookTitle,
      chatUrl: `${window.location.origin}/chat/${chatId}`
    });

    console.log('New message notification sent');
  } catch (error) {
    console.error('Error sending new message notification:', error);
  }
};

