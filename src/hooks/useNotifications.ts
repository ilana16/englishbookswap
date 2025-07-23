import { useCallback } from 'react';
import { 
  notifyNewMatch, 
  notifyBookAvailability, 
  notifyNewMessage 
} from '@/services/emailService';

export const useNotifications = () => {
  // Hook for triggering new match notifications
  const triggerNewMatchNotification = useCallback(async (
    ownerId: string,
    requesterId: string,
    bookId: string,
    bookTitle: string,
    bookAuthor: string,
    message?: string
  ) => {
    try {
      await notifyNewMatch(ownerId, requesterId, bookId, bookTitle, bookAuthor, message);
    } catch (error) {
      console.error('Failed to trigger new match notification:', error);
    }
  }, []);

  // Hook for triggering book availability notifications
  const triggerBookAvailabilityNotification = useCallback(async (
    bookId: string,
    bookTitle: string,
    bookAuthor: string,
    ownerId: string,
    condition: string,
    neighborhood: string
  ) => {
    try {
      await notifyBookAvailability(bookId, bookTitle, bookAuthor, ownerId, condition, neighborhood);
    } catch (error) {
      console.error('Failed to trigger book availability notification:', error);
    }
  }, []);

  // Hook for triggering new message notifications
  const triggerNewMessageNotification = useCallback(async (
    chatId: string,
    senderId: string,
    recipientId: string,
    messageContent: string,
    bookTitle?: string
  ) => {
    try {
      await notifyNewMessage(chatId, senderId, recipientId, messageContent, bookTitle);
    } catch (error) {
      console.error('Failed to trigger new message notification:', error);
    }
  }, []);

  return {
    triggerNewMatchNotification,
    triggerBookAvailabilityNotification,
    triggerNewMessageNotification
  };
};

export default useNotifications;

