import { Button } from "@/components/ui/button";
import { getBookById } from "@/services/googleBooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createOrGetChat } from "@/services/chatService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  description: string;
  condition: string;
  owner: {
    id?: string;
    name: string;
    neighborhood: string;
  };
  google_books_id?: string;
  genres?: string[];
}

interface BookCardProps {
  book: Book;
  onRequestSwap: (bookId: string, ownerId: string) => void;
  isLoadingSwap?: boolean;
}

export function BookCard({ book, onRequestSwap, isLoadingSwap = false }: BookCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  
  const { data: googleBook } = useQuery({
    queryKey: ['book', book.google_books_id],
    queryFn: () => book.google_books_id ? getBookById(book.google_books_id) : null,
    enabled: !!book.google_books_id,
  });
  
  const coverImage = googleBook?.volumeInfo.imageLinks?.thumbnail;
  
  const handleMessageClick = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send a message.",
        variant: "destructive"
      });
      return;
    }

    if (!book.owner.id) {
      toast({
        title: "Error",
        description: "Cannot message this book owner.",
        variant: "destructive"
      });
      return;
    }

    if (user.uid === book.owner.id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send a message to yourself.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingMessage(true);

    try {
      const chatId = await createOrGetChat(user.uid, book.owner.id, book.id);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const handleSwapClick = () => {
    if (book.owner.id) {
      onRequestSwap(book.id, book.owner.id);
    }
  };
  
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
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={handleSwapClick}
          disabled={isLoadingSwap || !book.owner.id}
        >
          {isLoadingSwap ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Requesting...
            </>
          ) : (
            'Request Swap'
          )}
        </Button>
        <Button
          variant="outline"
          className="flex items-center justify-center"
          onClick={handleMessageClick}
          disabled={isLoadingMessage || !book.owner.id}
          title="Message the book owner"
        >
          {isLoadingMessage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle size={18} />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
