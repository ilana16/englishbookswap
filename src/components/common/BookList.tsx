
import { BookCard, Book } from "./BookCard";
import { toast } from "@/components/ui/use-toast";

interface BookListProps {
  books: Book[];
  emptyMessage?: string;
}

export function BookList({ books, emptyMessage = "No books found" }: BookListProps) {
  const handleRequestSwap = (bookId: string) => {
    // In a real app, this would send the request to the backend
    toast({
      title: "Swap requested",
      description: "We'll notify you when the owner responds.",
    });
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
        />
      ))}
    </div>
  );
}
