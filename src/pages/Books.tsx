import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { BookList } from "@/components/common/BookList";
import { NeighborhoodFilter } from "@/components/common/NeighborhoodFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Book } from "@/components/common/BookCard";
import { COLLECTIONS } from "@/integrations/firebase/types";

const Books = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);

  const { data: books = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ['books', searchTerm, selectedNeighborhoods],
    queryFn: async () => {
      // Create a reference to the books collection
      const booksRef = collection(db, COLLECTIONS.BOOKS);
      
      // For Firebase, we'll fetch all books and filter client-side
      // since Firestore doesn't support complex text search like Supabase
      const querySnapshot = await getDocs(booksRef);
      
      // Map database results to our Book type
      const booksData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          author: data.author,
          coverColor: data.cover_color,
          description: data.description || "",
          condition: data.condition,
          owner: data.owner as { name: string; neighborhood: string }
        };
      });
      
      // Apply search filtering client-side
      let filteredBooks = booksData;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredBooks = filteredBooks.filter(book => 
          book.title.toLowerCase().includes(term) || 
          book.author.toLowerCase().includes(term) || 
          (book.description && book.description.toLowerCase().includes(term))
        );
      }
      
      // Apply neighborhood filtering client-side if needed
      if (selectedNeighborhoods.length > 0) {
        filteredBooks = filteredBooks.filter(book => 
          selectedNeighborhoods.includes(book.owner.neighborhood)
        );
      }
      
      console.log("Fetched books:", filteredBooks.length);
      return filteredBooks;
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="page-container">
          <div className="flex justify-center items-center py-12">
            <p className="text-lg">Loading books...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="page-container">
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <p className="text-lg text-red-600 font-medium mb-2">Error loading books</p>
              <p className="text-muted-foreground">{(error as Error).message || "Please try again later or contact support"}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-0">Browse Available Books</h1>
          <Button asChild className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
            <Link to="/add">Add Your Book</Link>
          </Button>
        </div>

        <div className="bg-white border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by title, author, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="col-span-1">
              <NeighborhoodFilter
                selectedNeighborhoods={selectedNeighborhoods}
                onChange={setSelectedNeighborhoods}
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {books.length} books
          </p>
        </div>

        <BookList 
          books={books} 
          emptyMessage="No books match your search criteria. Try adjusting your filters or add your own books to share!"
        />
      </div>
    </Layout>
  );
};

export default Books;
