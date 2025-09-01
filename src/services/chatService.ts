import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '@/integrations/firebase/config';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { shouldSendNotification } from '@/utils/notificationHelper';
import { sendNotificationWithFallback } from '@/utils/notificationService';

export interface ChatData {
  id?: string;
  participants: string[];
  created_at: any;
  updated_at: any;
  last_message?: string;
  last_message_time?: any;
  book_id?: string;
  book_title?: string;
}

export interface MessageData {
  id?: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: any;
  timestamp: any;
}

export const createOrGetChat = async (
  currentUserId: string,
  otherUserId: string,
  bookId?: string
): Promise<string> => {
  try {
    // Check if a chat already exists between these users
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );
    
    const querySnapshot = await getDocs(q);
    let existingChatId = null;
    
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      if (chatData.participants.includes(otherUserId)) {
        existingChatId = doc.id;
      }
    });
    
    if (existingChatId) {
      return existingChatId;
    }
    
    // Create new chat if none exists
    let bookTitle = '';
    if (bookId) {
      const bookDoc = await getDoc(doc(db, COLLECTIONS.BOOKS, bookId));
      if (bookDoc.exists()) {
        bookTitle = bookDoc.data().title;
      }
    }
    
    const chatData: Omit<ChatData, 'id'> = {
      participants: [currentUserId, otherUserId],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      book_id: bookId,
      book_title: bookTitle
    };
    
    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating or getting chat:', error);
    throw error;
  }
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  content: string
): Promise<string> => {
  try {
    const messageData: Omit<MessageData, 'id'> = {
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      content: content,
      created_at: serverTimestamp(),
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    // Send email notification to recipient if they have notifications enabled
    try {
      // Get chat data to find recipient
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as ChatData;
        const recipientId = chatData.participants.find(id => id !== senderId);
        
        if (recipientId) {
          // Check if recipient wants to receive message notifications
          const { shouldSend, email } = await shouldSendNotification(recipientId, 'new_messages');
          
          // Use fallback system to ensure notifications work
          await sendNotificationWithFallback('new_messages', email, shouldSend, recipientId);
        }
      }
    } catch (notificationError) {
      console.error('Error processing email notification:', notificationError);
      // Don't fail the message sending if notification fails
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

