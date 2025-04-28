import { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { BookList } from "@/components/common/BookList";
import { NeighborhoodFilter } from "@/components/common/NeighborhoodFilter";
import { GenreFilter } from "@/components/common/GenreFilter";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Book } from "@/components/common/BookCard";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { getBookById } from "@/services/googleBooks";

const Books = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Book[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  const { data: allBooks = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ["allBooks"], // Fetch all books once
    queryFn: async () => {
      const booksRef = collection(db, COLLECTIONS.BOOKS);
      const querySnapshot = await getDocs(booksRef);
      const booksData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          author: data.author,
          coverColor: data.cover_color,
          description: data.description || "",
          condition: data.condition,
          owner: data.owner as { name: string; neighborhood: string },
          google_books_id: data.google_books_id,
          genres: data.genres || []
        };
      });
      
      // Extract all unique genres from books for the filter
      const allGenres = new Set<string>();
      booksData.forEach(book => {
        if (book.genres && book.genres.length > 0) {
          book.genres.forEach(genre => allGenres.add(genre));
        }
      });
      setAvailableGenres(Array.from(allGenres).sort());
      
      return booksData;
    }
  });

  // Filter books based on search term, neighborhood, and genre
  const filteredBooks = useMemo(() => {
    let booksToFilter = allBooks;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      booksToFilter = booksToFilter.filter(book => 
        book.title.toLowerCase().includes(term) || 
        book.author.toLowerCase().includes(term) || 
        (book.description && book.description.toLowerCase().includes(term))
      );
    }

    if (selectedNeighborhoods.length > 0) {
      booksToFilter = booksToFilter.filter(book => 
        selectedNeighborhoods.includes(book.owner.neighborhood)
      );
    }

    if (selectedGenres.length > 0) {
      booksToFilter = booksToFilter.filter(book => 
        book.genres && book.genres.some(genre => selectedGenres.includes(genre))
      );
    }

    return booksToFilter;
  }, [allBooks, searchTerm, selectedNeighborhoods, selectedGenres]);

  // Update dropdown results when search term changes
  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      const term = searchTerm.toLowerCase();
      const results = allBooks.filter(book => 
        book.title.toLowerCase().includes(term) || 
        book.author.toLowerCase().includes(term)
      ).slice(0, 5); // Limit dropdown results
      setDropdownResults(results);
      setShowSearchResults(results.length > 0);
    } else {
      setDropdownResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm, allBooks]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDropdownSelect = (book: Book) => {
    setSearchTerm(book.title); // Set search term to selected book title
    setShowSearchResults(false);
  };

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
                  onChange={handleSearchInputChange}
                  className="pl-10"
                />
                
                {/* Interactive Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2">
                      {dropdownResults.map((book) => (
                        <div
                          key={book.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 border-b border-border last:border-0"
                          onClick={() => handleDropdownSelect(book)}
                        >
                          <div 
                            className="w-10 h-14 flex-shrink-0 rounded"
                            style={{ backgroundColor: book.coverColor || '#436B95' }}
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{book.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              by {book.author}
                            </p>
                            {book.condition && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Condition: {book.condition}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableGenres.length > 0 && (
                  <div>
                    <GenreFilter
                      selectedGenres={selectedGenres}
                      onChange={setSelectedGenres}
                      availableGenres={availableGenres}
                    />
                  </div>
                )}
                <div>
                  <NeighborhoodFilter
                    selectedNeighborhoods={selectedNeighborhoods}
                    onChange={setSelectedNeighborhoods}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBooks.length} books
          </p>
        </div>

        <BookList 
          books={filteredBooks} 
          emptyMessage="No books match your search criteria. Try adjusting your filters or add your own books to share!"
        />
      </div>
    </Layout>
  );
};

export default Books;
