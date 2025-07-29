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
import { auth, db } from '@/integrations/firebase/config';
import { User } from 'firebase/auth';

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

// Get user's email from Firebase Authentication
export const getUserEmail = async (userId: string): Promise<string | null> => {
  console.log('=== getUserEmail called with userId:', userId);
  try {
    // First check if this is the current user
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      console.log('Found current user email:', currentUser.email);
      return currentUser.email;
    }
    
    // For other users, we need to get their email from the profiles collection
    // Since Firebase Auth doesn't allow querying other users' emails for security reasons,
    // we'll need to store emails in the profiles collection or use a different approach
    console.log('Checking profiles collection for user:', userId);
    const profileDoc = await getDoc(doc(db, 'profiles', userId));
    console.log('Profile document exists:', profileDoc.exists());
    
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log("Profile data:", profileData);
      
      // Check if email was stored in profile (we'll need to add this)
      const email = profileData.email || profileData.auth_email || profileData.user_email || null;
      console.log("Extracted email from profile:", email);
      
      if (email) {
        return email;
      }
    }
    
    // If no email found in profile, we cannot get other users' emails
    // This is a Firebase security limitation - we can only access the current user's email
    console.log('No email found for userId:', userId, '- Firebase Auth security limitation');
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
  console.log('=== queueEmailNotification called ===');
  console.log('Recipient user ID:', recipientUserId);
  console.log('Template type:', templateType);
  
  try {
    // Get user's email and preferences
    const userEmail = await getUserEmail(recipientUserId);
    console.log('User email retrieved:', userEmail);
    
    if (!userEmail) {
      console.log('No email found for user:', recipientUserId);
      return null;
    }

    const preferences = await getNotificationPreferences(recipientUserId);
    console.log('User preferences:', preferences);
    
    if (!preferences) {
      console.log('No preferences found for user, using defaults');
      // If no preferences found, assume user wants notifications (default behavior)
    } else {
      // Check if user wants this type of notification
      const wantsNotification = 
        (templateType === 'new_match' && preferences.email_notifications.new_matches) ||
        (templateType === 'book_availability' && preferences.email_notifications.book_availability) ||
        (templateType === 'new_message' && preferences.email_notifications.new_messages);

      if (!wantsNotification) {
        console.log(`User ${recipientUserId} has disabled ${templateType} notifications`);
        return null;
      }
    }

    // Get recipient name from profile
    const profileDoc = await getDoc(doc(db, 'profiles', recipientUserId));
    const recipientName = profileDoc.exists() 
      ? (profileDoc.data().display_name || profileDoc.data().username || 'Book Lover')
      : 'Book Lover';

    // Add recipient name to template data
    const enhancedTemplateData = {
      ...templateData,
      recipientName
    };

    console.log('Calling sendEmailNotification...');
    const success = await sendEmailNotification(userEmail, templateType, enhancedTemplateData);
    
    if (success) {
      console.log('Email notification sent successfully to:', userEmail);
      return 'sent';
    } else {
      console.log('Failed to send email notification');
      return null;
    }
  } catch (error) {
    console.error('Error queueing email notification:', error);
    return null;
  }
};

// Send an email notification using Firebase Trigger Email extension
export const sendEmailNotification = async (
  recipientEmail: string,
  templateType: 'new_match' | 'book_availability' | 'new_message',
  templateData: any
): Promise<boolean> => {
  console.log('=== sendEmailNotification called ===');
  console.log('Recipient:', recipientEmail);
  console.log('Template type:', templateType);
  console.log('Template data:', templateData);
  
  try {
    const template = EMAIL_TEMPLATES[templateType];
    const subject = template.subject(templateData);
    const htmlContent = template.html(templateData);
    
    console.log('Generated subject:', subject);
    console.log('Generated HTML content length:', htmlContent.length);

    // Write to mail collection - Firebase extension will automatically send the email
    const mailDoc = {
      to: [recipientEmail],
      message: {
        subject: subject,
        html: htmlContent
      },
      template: {
        name: templateType,
        data: templateData
      },
      created_at: serverTimestamp()
    };
    
    console.log('Writing email document to mail collection...');
    const docRef = await addDoc(collection(db, 'mail'), mailDoc);
    console.log('Email document written with ID:', docRef.id);
    
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
  console.log('=== EMAIL NOTIFICATION DEBUG START ===');
  console.log('notifyNewMessage called with:', {
    chatId,
    senderId,
    recipientId,
    messageContent,
    bookTitle
  });
  
  try {
    // Get sender and recipient names
    console.log('Getting sender and recipient profiles...');
    const [senderDoc, recipientDoc] = await Promise.all([
      getDoc(doc(db, 'profiles', senderId)),
      getDoc(doc(db, 'profiles', recipientId))
    ]);

    console.log('Sender doc exists:', senderDoc.exists());
    console.log('Recipient doc exists:', recipientDoc.exists());

    const senderName = senderDoc.exists()
      ? (senderDoc.data().display_name || senderDoc.data().username || 'Book Swapper')
      : 'Book Swapper';
    
    const recipientName = recipientDoc.exists()
      ? (recipientDoc.data().display_name || recipientDoc.data().username || 'Book Lover')
      : 'Book Lover';

    console.log('Sender name:', senderName);
    console.log('Recipient name:', recipientName);

    console.log('Calling queueEmailNotification...');
    const result = await queueEmailNotification(recipientId, 'new_message', {
      senderName,
      recipientName,
      messageContent,
      bookTitle,
      chatUrl: `${window.location.origin}/chat/${chatId}`
    });

    console.log('queueEmailNotification result:', result);
    console.log('=== EMAIL NOTIFICATION DEBUG END ===');
  } catch (error) {
    console.error('=== EMAIL NOTIFICATION ERROR ===', error);
    console.error('Error sending new message notification:', error);
  }
};

