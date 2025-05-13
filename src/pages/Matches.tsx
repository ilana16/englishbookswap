import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { BookCard, Book } from "@/components/common/BookCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS, WantedBook as WantedBookType, Book as BookType } from "@/integrations/firebase/types"; // Import full types
import { getBooksByUser, getWantedBooksByUser } from "@/integrations/firebase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";

interface MatchGroup {
  user: {
    id: string;
    name: string;
    neighborhood: string;
    booksOffered: Book[]; // This Book is the local display Book type
    booksWanted: Book[];  // This Book is the local display Book type
  };
  matchScore: number;
}

const Matches = () => {
  const { user } = useAuth();
  
  const { data: matches = [], isLoading, error } = useQuery<MatchGroup[]>({
    queryKey: ["matches", user?.uid], // Add user.uid to queryKey for re-fetching on user change
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const userId = user.uid;

      // Get current user's books (books they have)
      const currentUserBooks: BookType[] = await getBooksByUser(userId);
      
      // Get current user's wanted books (books they want)
      const currentUserWantedBooks: WantedBookType[] = await getWantedBooksByUser(userId);

      // Get all other users' books
      const booksRef = collection(db, COLLECTIONS.BOOKS);
      const otherBooksQuery = query(booksRef, where("owner.id", "!=", userId));
      const otherBooksSnapshot = await getDocs(otherBooksQuery);
      
      const otherUsersBooks: BookType[] = otherBooksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<BookType, "id">)
      }));

      // Get all other users' wanted books
      const wantedBooksRef = collection(db, COLLECTIONS.WANTED_BOOKS);
      const otherWantedBooksQuery = query(wantedBooksRef, where("user_id", "!=", userId));
      const otherWantedBooksSnapshot = await getDocs(otherWantedBooksQuery);
      
      const otherUsersWantedBooks: WantedBookType[] = otherWantedBooksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<WantedBookType, "id">)
      }));

      // Group books by owner
      const booksByOwner: { 
        [key: string]: { 
          id: string; 
          name: string; 
          neighborhood: string; 
          books: BookType[]; 
          wantedBooks: WantedBookType[]; 
        }
      } = {};

      otherUsersBooks.forEach(book => {
        const ownerId = book.owner.id as string; // Assuming owner.id is always present and string
        if (!booksByOwner[ownerId]) {
          booksByOwner[ownerId] = {
            id: ownerId,
            name: (book.owner.name as string) || "Unknown User",
            neighborhood: (book.owner.neighborhood as string) || "Unknown",
            books: [],
            wantedBooks: []
          };
        }
        booksByOwner[ownerId].books.push(book);
      });

      // Group wanted books by user
      otherUsersWantedBooks.forEach(wantedBook => {
        const ownerId = wantedBook.user_id;
        if (booksByOwner[ownerId]) {
          booksByOwner[ownerId].wantedBooks.push(wantedBook);
        } else {
          // If user only has wanted books and no books for swap, they might not be in booksByOwner yet
          // This case might need handling if we want to show users who only want books from current user
          // For now, we only match with users who also offer books.
        }
      });

      const generatedMatches: MatchGroup[] = [];
      
      for (const ownerId in booksByOwner) {
        const ownerInfo = booksByOwner[ownerId];
        const ownerBooks = ownerInfo.books; // These are BookType
        const ownerWantedBooks = ownerInfo.wantedBooks || []; // These are WantedBookType
        
        const booksOfferedToCurrentUser: Book[] = []; // For display
        const booksWantedByCurrentUser: Book[] = []; // For display (these are current user's books that other user wants)
        let matchScore = 0;
        
        // Find books that the other user has that the current user wants
        for (const ownerBook of ownerBooks) { // ownerBook is BookType
          const isExplicitlyWanted = currentUserWantedBooks.some(
            wantedBook => // wantedBook is WantedBookType
              wantedBook.title.toLowerCase() === ownerBook.title.toLowerCase() &&
              wantedBook.author.toLowerCase() === ownerBook.author.toLowerCase() &&
              (wantedBook.condition === "any" || wantedBook.condition === ownerBook.condition)
          );
          
          const bookForDisplay: Book = {
            id: ownerBook.id,
            title: ownerBook.title,
            author: ownerBook.author,
            coverColor: ownerBook.cover_color || "#436B95",
            description: ownerBook.description || "",
            condition: ownerBook.condition,
            owner: {
              name: ownerInfo.name, // Other user's name
              neighborhood: ownerInfo.neighborhood // Other user's neighborhood
            }
          };

          if (isExplicitlyWanted) {
            booksOfferedToCurrentUser.push(bookForDisplay);
            matchScore += 5;
          } else {
            const hasMatchingAuthor = currentUserWantedBooks.some(
              wantedBook => wantedBook.author.toLowerCase() === ownerBook.author.toLowerCase() &&
                            (wantedBook.condition === "any" || wantedBook.condition === ownerBook.condition)
            );
            if (hasMatchingAuthor) {
              booksOfferedToCurrentUser.push(bookForDisplay);
              matchScore += 2;
            } else {
              const hasRelatedTitle = currentUserWantedBooks.some(wantedBook => {
                const wantedBookWords = wantedBook.title.toLowerCase().split(" ");
                const ownerBookWords = ownerBook.title.toLowerCase().split(" ");
                return wantedBookWords.some(word => 
                  word.length > 3 && ownerBookWords.includes(word)
                ) && (wantedBook.condition === "any" || wantedBook.condition === ownerBook.condition);
              });
              if (hasRelatedTitle) {
                booksOfferedToCurrentUser.push(bookForDisplay);
                matchScore += 1;
              }
            }
          }
        }
        
        // Find books that the current user has that the other user wants
        for (const userBook of currentUserBooks) { // userBook is BookType
          const isExplicitlyWantedByOther = ownerWantedBooks.some(
            wantedBook => // wantedBook is WantedBookType
              wantedBook.title.toLowerCase() === userBook.title.toLowerCase() &&
              wantedBook.author.toLowerCase() === userBook.author.toLowerCase() &&
              (wantedBook.condition === "any" || wantedBook.condition === userBook.condition)
          );

          const bookForDisplay: Book = {
            id: userBook.id,
            title: userBook.title,
            author: userBook.author,
            coverColor: userBook.cover_color || "#436B95",
            description: userBook.description || "",
            condition: userBook.condition,
            owner: {
              name: user.displayName || user.email || "You",
              neighborhood: userBook.neighborhood // Current user's book's neighborhood (should be profile default)
            }
          };

          if (isExplicitlyWantedByOther) {
            booksWantedByCurrentUser.push(bookForDisplay);
            matchScore += 5;
          } else {
            const hasMatchingAuthor = ownerWantedBooks.some(
              wantedBook => wantedBook.author.toLowerCase() === userBook.author.toLowerCase() &&
                            (wantedBook.condition === "any" || wantedBook.condition === userBook.condition)
            );
            if (hasMatchingAuthor) {
              booksWantedByCurrentUser.push(bookForDisplay);
              matchScore += 2;
            } else {
              const hasRelatedTitle = ownerWantedBooks.some(wantedBook => {
                const wantedBookWords = wantedBook.title.toLowerCase().split(" ");
                const userBookWords = userBook.title.toLowerCase().split(" ");
                return wantedBookWords.some(word => 
                  word.length > 3 && userBookWords.includes(word)
                ) && (wantedBook.condition === "any" || wantedBook.condition === userBook.condition);
              });
              if (hasRelatedTitle) {
                booksWantedByCurrentUser.push(bookForDisplay);
                matchScore += 1;
              }
            }
          }
        }
        
        if (booksOfferedToCurrentUser.length > 0 || booksWantedByCurrentUser.length > 0) {
          const normalizedScore = Math.min(Math.round(matchScore / 2), 10);
          
          generatedMatches.push({
            user: {
              id: ownerId,
              name: ownerInfo.name,
              neighborhood: ownerInfo.neighborhood,
              booksOffered: booksOfferedToCurrentUser,
              booksWanted: booksWantedByCurrentUser
            },
            matchScore: normalizedScore
          });
        }
      }
      
      return generatedMatches.sort((a, b) => b.matchScore - a.matchScore);
    },
    enabled: !!user
  });

  const handleRequestSwap = (bookId: string) => {
    toast({
      title: "Swap requested",
      description: "We'll notify you when the owner responds.",
    });
  };

  const handleStartChat = (otherUserId: string) => {
    // Navigate to chat or open chat modal with otherUserId
    // This part depends on how chat is implemented
    navigate(`/chat/${otherUserId}`); // Example navigation
    toast({
      title: "Chat started",
      description: "You can now coordinate the book swap.",
    });
  };

  if (!user) {
    return (
      <Layout>
        <div className="page-container">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Please sign in to see your matches</p>
            <Button asChild className="mt-4 bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="page-container">
          <h1 className="section-heading">Your Book Swap Matches</h1>
          <div className="flex justify-center items-center py-12">
            <p className="text-lg">Loading matches...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="page-container">
          <h1 className="section-heading">Your Book Swap Matches</h1>
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <p className="text-lg text-red-600 font-medium mb-2">Error loading matches</p>
              <p className="text-muted-foreground">{(error as Error).message || "Please try again later"}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        <h1 className="section-heading">Your Book Swap Matches</h1>

        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          These are potential swap partners based on the books you have listed and the books you are looking for. 
          Higher match scores indicate more opportunities to swap multiple books with the same person.
        </p>

        {matches.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-8 text-center">
            <h2 className="text-xl font-bold mb-3">No Matches Found Yet</h2>
            <p className="text-muted-foreground mb-6">
              To increase your chances of finding matches:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 mb-6">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Add more books that you are willing to swap</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Add books you are looking for to your wishlist</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Check back regularly as new books are added daily</span>
              </li>
            </ul>
            <Button asChild className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
              <Link to="/add">Add More Books</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {matches.map((match) => (
              <div key={match.user.id} className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-bookswap-blue p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{match.user.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Neighborhood: {match.user.neighborhood} • Match Score: {match.matchScore}/10
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-3 md:mt-0 bg-white"
                    onClick={() => handleStartChat(match.user.id)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                </div>
                
                <div className="p-4 md:p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Books They Have (That You Might Like)</h3>
                    {match.user.booksOffered.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {match.user.booksOffered.map((book) => (
                          <BookCard 
                            key={book.id} 
                            book={book} 
                            onRequestSwap={handleRequestSwap} 
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No matching books found in this category.</p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold mb-3">Your Books (That They Might Like)</h3>
                    {match.user.booksWanted.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {match.user.booksWanted.map((book) => (
                          <BookCard 
                            key={book.id} 
                            book={book} 
                            onRequestSwap={handleRequestSwap}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No matching books found in this category.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Matches;

