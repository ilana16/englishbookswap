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
  book_type?: 'have' | 'want'; // New field to distinguish between books user has and wants
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
}

export interface Chat {
  avatar: string | null;
  created_at: string;
  id: string;
  last_message: string | null;
  last_message_time: string;
  name: string;
  unread: boolean;
  updated_at: string;
  user_id: string;
}

export interface Message {
  chat_id: string;
  created_at: string;
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface Profile {
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  display_name: string | null;
  id: string;
  neighborhood: string | null;
  updated_at: string;
  username: string | null;
}

// Firebase collection names
export const COLLECTIONS = {
  BOOKS: 'books',
  WANTED_BOOKS: 'wanted_books', // New collection for books users want
  CHATS: 'chats',
  MESSAGES: 'messages',
  PROFILES: 'profiles'
} as const;
