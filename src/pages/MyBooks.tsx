import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { Book } from "@/components/common/BookCard";
import { MyBooksList } from "@/components/common/MyBooksList";
import { getBooksByUser, getWantedBooksByUser } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";

export default function MyBooks() {
  const { user } = useAuth();

  // Query for books the user has
  const { 
    data: booksIHave = [], 
    isLoading: isLoadingHave, 
    error: errorHave 
  } = useQuery<Book[], Error>({
    queryKey: ['my-books-have'],
    queryFn: async (): Promise<Book[]> => {
      if (!user) return [] as Book[];
      
      try {
        const books = await getBooksByUser(user.uid);
        return processBooks(books, 'have');
      } catch (error) {
        console.error("Error fetching books I have:", error);
        throw error;
      }
    },
    enabled: !!user
  });

  // Query for books the user wants
  const { 
    data: booksIWant = [], 
    isLoading: isLoadingWant, 
    error: errorWant 
  } = useQuery<Book[], Error>({
    queryKey: ['my-books-want'],
    queryFn: async (): Promise<Book[]> => {
      if (!user) return [] as Book[];
      
      try {
        const books = await getWantedBooksByUser(user.uid);
        return processBooks(books, 'want');
      } catch (error) {
        console.error("Error fetching books I want:", error);
        throw error;
      }
    },
    enabled: !!user
  });

  // Move the processing logic to a separate function to reduce complexity in the queryFn
  function processBooks(data: any[], type: 'have' | 'want'): Book[] {
    const result: Book[] = [];
    
    for (const item of data) {
      const book: Book = {
        id: String(item.id || ''),
        title: String(item.title || ''),
        author: String(item.author || ''),
        coverColor: String(item.cover_color || '#436B95'),
        description: item.description ? String(item.description) : "",
        condition: type === 'have' ? String(item.condition || 'Good') : undefined,
        owner: type === 'have' ? {
          name: getOwnerProperty(item.owner, 'name'),
          neighborhood: getOwnerProperty(item.owner, 'neighborhood')
        } : undefined,
        google_books_id: item.google_books_id ? String(item.google_books_id) : undefined,
        book_type: type
      };
      
      result.push(book);
    }
    
    return result;
  }

  // Helper function with explicit typing to safely extract owner properties
  function getOwnerProperty(owner: unknown, key: string): string {
    if (owner && typeof owner === 'object' && owner !== null) {
      const ownerObj = owner as Record<string, unknown>;
      const value = ownerObj[key];
      return typeof value === 'string' ? value : '';
    }
    return '';
  }

  if (!user) {
    return (
      <Layout>
        <div className="page-container">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Please sign in to manage your books</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = isLoadingHave || isLoadingWant;
  const hasError = errorHave || errorWant;

  return (
    <Layout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Books</h1>
          <Button asChild className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
            <Link to="/add" className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add a Book
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bookswap-darkblue mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading your books...</p>
          </div>
        ) : hasError ? (
          <div className="text-center py-12">
            <p className="text-lg text-red-600">Error loading your books</p>
          </div>
        ) : (
          <MyBooksList booksIHave={booksIHave} booksIWant={booksIWant} />
        )}
      </div>
    </Layout>
  );
}
