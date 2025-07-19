
import { BookCard, Book } from "./BookCard";
import { toast } from "@/components/ui/use-toast";
import { createSwapRequest } from "@/services/swapService";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface BookListProps {
  books: Book[];
  emptyMessage?: string;
}

export function BookList({ books, emptyMessage = "No books found" }: BookListProps) {
  const { user, profile } = useAuth();
  const [loadingSwaps, setLoadingSwaps] = useState<Set<string>>(new Set());

  const handleRequestSwap = async (bookId: string, ownerId: string) => {
    if (!user || !profile) {
      toast({
        title: "Authentication required",
        description: "Please log in to request a book swap.",
        variant: "destructive"
      });
      return;
    }

    if (user.uid === ownerId) {
      toast({
        title: "Cannot request swap",
        description: "You cannot request a swap for your own book.",
        variant: "destructive"
      });
      return;
    }

    setLoadingSwaps(prev => new Set(prev).add(bookId));

    try {
      await createSwapRequest(
        user.uid,
        profile.display_name || profile.username || 'Unknown User',
        bookId,
        ownerId
      );

      toast({
        title: "Swap requested",
        description: "We'll notify you when the owner responds.",
      });
    } catch (error) {
      console.error('Error requesting swap:', error);
      toast({
        title: "Error",
        description: "Failed to send swap request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingSwaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {books.map((book) => (
        <BookCard 
          key={book.id} 
          book={book} 
          onRequestSwap={handleRequestSwap}
          isLoadingSwap={loadingSwaps.has(book.id)}
        />
      ))}
    </div>
  );
}
