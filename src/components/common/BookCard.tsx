
import { Button } from "@/components/ui/button";
import { getBookById } from "@/services/googleBooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  description: string;
  condition: string;
  owner: {
    name: string;
    neighborhood: string;
  };
  google_books_id?: string;
}

interface BookCardProps {
  book: Book;
  onRequestSwap: (bookId: string) => void;
}

export function BookCard({ book, onRequestSwap }: BookCardProps) {
  const { data: googleBook } = useQuery({
    queryKey: ['book', book.google_books_id],
    queryFn: () => book.google_books_id ? getBookById(book.google_books_id) : null,
    enabled: !!book.google_books_id,
  });

  const coverImage = googleBook?.volumeInfo.imageLinks?.thumbnail;

  return (
    <Card className="h-full flex flex-col">
      {coverImage ? (
        <div 
          className="w-full h-48 bg-cover bg-center rounded-t-lg"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
      ) : (
        <div 
          className="w-full h-48 p-4 flex flex-col justify-center items-center text-center rounded-t-lg"
          style={{ backgroundColor: book.coverColor }}
        >
          <h3 className="font-bold text-white">{book.title}</h3>
          <p className="text-sm text-white/80">{book.author}</p>
        </div>
      )}

      <CardContent className="flex-grow p-4">
        <h3 className="font-bold text-lg mb-1">{book.title}</h3>
        <p className="text-sm font-medium mb-2">{book.author}</p>
        <p className="text-xs text-muted-foreground mb-2">
          Condition: {book.condition}
        </p>
        <p className="text-xs line-clamp-3 mb-3">
          {book.description}
        </p>
        <p className="text-xs text-muted-foreground">
          Available in: {book.owner.neighborhood}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          variant="default" 
          className="w-full"
          onClick={() => onRequestSwap(book.id)}
        >
          Request Swap
        </Button>
      </CardFooter>
    </Card>
  );
}
