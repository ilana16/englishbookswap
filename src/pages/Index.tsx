import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Book, ArrowRight } from "lucide-react";
import { BookList } from "@/components/common/BookList";
import { useQuery } from "@tanstack/react-query";
import { Book as BookType } from "@/components/common/BookCard";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { useState, useEffect } from "react";
import { HowToUseGuide } from "@/components/home/HowToUseGuide";

const Index = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { data: featuredBooks = [], isLoading, error } = useQuery<BookType[]>({
    queryKey: ['featuredBooks'],
    queryFn: async () => {
      try {
        const booksRef = collection(db, COLLECTIONS.BOOKS);
        const q = query(
          booksRef,
          orderBy('created_at', 'desc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        
        // If no books are found, return empty array but don't throw an error
        if (querySnapshot.empty) {
          return [];
        }
        
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            author: data.author,
            coverColor: data.cover_color || '#436B95',
            description: data.description || "",
            condition: data.condition,
            owner: data.owner as { name: string; neighborhood: string }
          };
        });
      } catch (error) {
        console.error("Error fetching books:", error);
        // Set a more user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes("permission")) {
            setErrorMessage("Unable to access book data. Please try again later.");
          } else {
            setErrorMessage("Something went wrong. Please try again later.");
          }
        }
        throw error;
      }
    },
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // If there are no books but no error, show a welcome message instead of an error
  if (featuredBooks.length === 0 && !isLoading && !error) {
    return (
      <Layout>
        <div className="bg-bookswap-blue py-16 md:py-24">
          <div className="page-container">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Welcome to English Book Swap Jerusalem
              </h1>
              <p className="text-lg md:text-xl mb-8">
                Be the first to add books to our community! No books have been added yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
                  <Link to="/add">Add Your First Book</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white py-12 md:py-16 border-y border-border">
          <div className="page-container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                  <Book className="w-8 h-8 text-bookswap-darkblue" />
                </div>
                <h3 className="text-xl font-bold mb-2">List Your Books</h3>
                <p className="text-muted-foreground">
                  Share the books you've enjoyed and are ready to pass on to another reader in Jerusalem.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-8 h-8 text-bookswap-darkblue"
                  >
                    <path d="M16 3h5v5" />
                    <path d="M8 3H3v5" />
                    <path d="M21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
                    <path d="m21 8-5-5-5 5" />
                    <path d="m3 16 5 5 5-5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Find Matches</h3>
                <p className="text-muted-foreground">
                  Our system matches you with local readers who have books you want or want books you have.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-8 h-8 text-bookswap-darkblue"
                  >
                    <path d="M17 6.1H3" />
                    <path d="M21 12.1H3" />
                    <path d="M15.1 18H3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Meet & Swap</h3>
                <p className="text-muted-foreground">
                  Arrange to meet at a convenient location in your neighborhood and exchange books.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bookswap-darkblue mx-auto mb-4"></div>
            <p className="text-lg">Loading featured books...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center max-w-md mx-auto p-6 bg-red-50 border border-red-100 rounded-lg">
            <h2 className="text-xl font-bold text-red-700 mb-2">
              {errorMessage || "Error loading featured books"}
            </h2>
            <p className="text-gray-600 mb-4">
              We're having trouble connecting to our database. This could be due to:
            </p>
            <ul className="text-left text-gray-600 mb-4 space-y-1">
              <li>• Temporary connection issues</li>
              <li>• Database maintenance</li>
              <li>• Security configuration updates</li>
            </ul>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90"
            >
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-bookswap-blue py-16 md:py-24">
        <div className="page-container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Share the Joy of Reading in Jerusalem
            </h1>
            <p className="text-lg md:text-xl mb-8">
              Connect with fellow book lovers and swap English books locally. 
              No money, no points—just a community sharing stories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
                <Link to="/books">Browse Available Books</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/add">Share Your Books</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-12 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Recently Added Books</h2>
          <Link to="/books" className="flex items-center text-bookswap-darkblue hover:underline">
            <span>View all</span>
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
        
        <BookList books={featuredBooks} />
      </div>

      {/* How to Use Guide Section */}
      <HowToUseGuide />

      <div className="bg-white py-12 md:py-16 border-y border-border">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                <Book className="w-8 h-8 text-bookswap-darkblue" />
              </div>
              <h3 className="text-xl font-bold mb-2">List Your Books</h3>
              <p className="text-muted-foreground">
                Share the books you've enjoyed and are ready to pass on to another reader in Jerusalem.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-8 h-8 text-bookswap-darkblue"
                >
                  <path d="M16 3h5v5" />
                  <path d="M8 3H3v5" />
                  <path d="M21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
                  <path d="m21 8-5-5-5 5" />
                  <path d="m3 16 5 5 5-5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Find Matches</h3>
              <p className="text-muted-foreground">
                Our system matches you with local readers who have books you want or want books you have.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-bookswap-blue flex items-center justify-center mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-8 h-8 text-bookswap-darkblue"
                >
                  <path d="M17 6.1H3" />
                  <path d="M21 12.1H3" />
                  <path d="M15.1 18H3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Meet & Swap</h3>
              <p className="text-muted-foreground">
                Arrange to meet at a convenient location in your neighborhood and exchange books.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-12 md:py-16">
        <div className="bg-bookswap-stone/20 border border-bookswap-stone/30 rounded-lg p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Join Our Growing Community
          </h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto">
            Help us maximize the circulation of English books throughout Jerusalem. 
            Every book deserves new readers, and every reader deserves new books.
          </p>
          <Button asChild size="lg" className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
            <Link to="/books">Start Swapping Now</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
