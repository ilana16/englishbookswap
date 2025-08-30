export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Book {
  author: string;
  condition: string;
  cover_color: string;
  created_at: string;
  description: string | null;
  google_books_id: string | null;
  id: string;
  owner: Json;
  title: string;
  updated_at: string;
  book_type?: 'have' | 'want';
  neighborhood: string; // Added to ensure all books have a neighborhood
  genres?: string[]; // Added for consistency
}

export interface WantedBook {
  author: string;
  created_at: string;
  description: string | null;
  google_books_id: string | null;
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
  condition: string; // Added for "no preference" (stores "any") or specific condition
  neighborhood: string; // Added to ensure all wanted books have a neighborhood (user's default)
  genres?: string[]; // Added for consistency
}

export interface Chat {
  created_at: string;
  id: string;
  last_message: string | null;
  last_message_time: string;
  name: string;
  unread: boolean;
  updated_at: string;
  user_id: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  downloadUrl?: string;
}

export interface Message {
  chat_id: string;
  created_at: string;
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  attachments?: FileAttachment[];
}

export interface Profile {
  bio: string | null;
  created_at: string;
  display_name: string | null;
  id: string;
  neighborhood: string | null; // This is the default neighborhood
  updated_at: string;
  username: string | null;
}

// Firebase collection names
export const COLLECTIONS = {
  BOOKS: 'books',
  WANTED_BOOKS: 'wanted_books',
  CHATS: 'chats',
  MESSAGES: 'messages',
  PROFILES: 'profiles'
} as const;
