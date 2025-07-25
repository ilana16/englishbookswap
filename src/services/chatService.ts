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
import { db } from '@/integrations/firebase/config';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { notifyNewMessage } from './emailService';

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
    
    console.log('Attempting to send message:', messageData);
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    console.log('Message sent, docRef.id:', docRef.id);
    
    // Get chat details to find the recipient and book info
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const participants = chatData.participants || [];
        const recipientId = participants.find((id: string) => id !== senderId);
        console.log('Chat data:', chatData);
        console.log('Participants:', participants);
        console.log('Recipient ID:', recipientId);
        
        if (recipientId) {
          console.log('Calling notifyNewMessage with:', {
            chatId,
            senderId,
            recipientId,
            content,
            bookTitle: chatData.book_title
          });
          await notifyNewMessage(
            chatId,
            senderId,
            recipientId,
            content,
            chatData.book_title
          );
          console.log('notifyNewMessage call completed.');
        }
      } else {
        console.log('Chat document not found for chatId:', chatId);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the message if email fails
    }
    
    // Update chat's last message
    // This would typically be done with a transaction or cloud function
    // For now, we'll just return the message ID
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

