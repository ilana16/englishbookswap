import { useState } from "react";
import { Book } from "./BookCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen, Search } from "lucide-react";
import { deleteBook, deleteWantedBook } from "@/integrations/firebase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface MyBooksListProps {
  booksIHave: Book[];
  booksIWant: Book[];
}

export function MyBooksList({ booksIHave, booksIWant }: MyBooksListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDeleteHave = async (bookId: string) => {
    setIsDeleting(bookId);
    try {
      await deleteBook(bookId);
      toast.success("Book removed successfully");
      queryClient.invalidateQueries({ queryKey: ['my-books-have'] });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error("Failed to remove book");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteWant = async (bookId: string) => {
    setIsDeleting(bookId);
    try {
      await deleteWantedBook(bookId);
      toast.success("Book removed from wishlist");
      queryClient.invalidateQueries({ queryKey: ['my-books-want'] });
    } catch (error) {
      console.error('Error deleting wanted book:', error);
      toast.error("Failed to remove book from wishlist");
    } finally {
      setIsDeleting(null);
    }
  };

  const renderEmptyState = (type: 'have' | 'want') => (
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground mb-4">
        {type === 'have' 
          ? "You haven't added any books you own yet" 
          : "You haven't added any books you're looking for yet"}
      </p>
      <Button 
        variant="default" 
        onClick={() => window.location.href = type === 'have' ? '/add' : '/add?type=want'}
      >
        {type === 'have' ? (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Add a Book You Own
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Add a Book You Want
          </>
        )}
      </Button>
    </div>
  );

  const renderBookGrid = (books: Book[], type: 'have' | 'want') => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {books.map((book) => (
        <Card key={book.id} className="relative">
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => type === 'have' ? handleDeleteHave(book.id) : handleDeleteWant(book.id)}
            disabled={isDeleting === book.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <CardContent className="pt-4">
            {book.google_books_id ? (
              <div 
                className="w-full h-48 bg-cover bg-center rounded-lg mb-4"
                style={{ 
                  backgroundImage: `url(https://books.google.com/books/content?id=${book.google_books_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api)`
                }}
              />
            ) : (
              <div 
                className="w-full h-48 p-4 flex flex-col justify-center items-center text-center rounded-lg mb-4"
                style={{ backgroundColor: book.coverColor || book.cover_color || '#436B95' }}
              >
                <h3 className="font-bold text-white">{book.title}</h3>
                <p className="text-sm text-white/80">{book.author}</p>
              </div>
            )}
            
            <h3 className="font-bold text-lg mb-1">{book.title}</h3>
            <p className="text-sm font-medium mb-2">{book.author}</p>
            {type === 'have' && (
              <p className="text-xs text-muted-foreground">
                Condition: {book.condition}
              </p>
            )}
            {type === 'want' && (
              <p className="text-xs text-muted-foreground">
                On your wishlist
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Books I Have Column */}
        <div className="w-full">
          <div className="flex items-center mb-6">
            <BookOpen className="mr-2 h-5 w-5" />
            <h2 className="text-xl font-bold">Books I Have</h2>
          </div>
          {booksIHave.length === 0 ? renderEmptyState('have') : renderBookGrid(booksIHave, 'have')}
        </div>
        
        {/* Books I Want Column */}
        <div className="w-full">
          <div className="flex items-center mb-6">
            <Search className="mr-2 h-5 w-5" />
            <h2 className="text-xl font-bold">Books I Want</h2>
          </div>
          {booksIWant.length === 0 ? renderEmptyState('want') : renderBookGrid(booksIWant, 'want')}
        </div>
      </div>
    </div>
  );
}
