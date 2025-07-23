import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { notifyNewMatch } from './emailService';

export interface SwapRequest {
  id?: string;
  requester_id: string;
  requester_name: string;
  book_id: string;
  book_title: string;
  book_author: string;
  owner_id: string;
  owner_name: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: any;
  updated_at: any;
  message?: string;
}

export const createSwapRequest = async (
  requesterId: string,
  requesterName: string,
  bookId: string,
  ownerId: string,
  message?: string
): Promise<string> => {
  try {
    // Get book details
    const bookDoc = await getDoc(doc(db, COLLECTIONS.BOOKS, bookId));
    if (!bookDoc.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookDoc.data();
    
    // Get owner details
    const ownerDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, ownerId));
    if (!ownerDoc.exists()) {
      throw new Error('Owner not found');
    }
    
    const ownerData = ownerDoc.data();
    
    const swapRequest: Omit<SwapRequest, 'id'> = {
      requester_id: requesterId,
      requester_name: requesterName,
      book_id: bookId,
      book_title: bookData.title,
      book_author: bookData.author,
      owner_id: ownerId,
      owner_name: ownerData.display_name || ownerData.username || 'Unknown User',
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      message: message || ''
    };
    
    const docRef = await addDoc(collection(db, 'swap_requests'), swapRequest);
    
    // Trigger email notification for new match
    try {
      await notifyNewMatch(
        ownerId,
        requesterId,
        bookId,
        bookData.title,
        bookData.author,
        message
      );
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the swap request if email fails
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating swap request:', error);
    throw error;
  }
};

export const getSwapRequestsByUser = async (userId: string) => {
  // This would be implemented to fetch swap requests for a user
  // For now, we'll just return an empty array
  return [];
};

