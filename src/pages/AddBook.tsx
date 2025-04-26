import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Loader2, BookOpen, BookPlus } from "lucide-react";
import { GoogleBook, searchBooks } from "@/services/googleBooks";
import { jerusalemNeighborhoods } from "@/data/jerusalemNeighborhoods";
import { addBook, addWantedBook } from "@/integrations/firebase/client";
import { useAuth } from "@/components/AuthProvider";

const conditions = ["Like New", "Very Good", "Good", "Fair", "Poor"];

const AddBook = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookType, setBookType] = useState<"have" | "want">("have");
  const [formData, setFormData] = useState({
    condition: "",
    neighborhood: "",
  });
  
  // Check URL parameters for initial book type
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam === 'want') {
      setBookType('want');
    }
  }, [location]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchBooks(searchQuery);
      setSearchResults(results);
      console.log('Search results:', results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error("Error searching for books");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookSelect = (book: GoogleBook) => {
    console.log('Selected book:', book);
    setSelectedBook(book);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !formData.condition || !formData.neighborhood || !user) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate a color from the book ID if we have one, otherwise use default
      const coverColor = selectedBook.volumeInfo.imageLinks?.thumbnail 
        ? '#' + selectedBook.id.slice(0, 6) 
        : '#436B95';
        
      const bookData = {
        title: selectedBook.volumeInfo.title,
        author: selectedBook.volumeInfo.authors?.[0] || "Unknown Author",
        description: selectedBook.volumeInfo.description || "",
        cover_color: coverColor,
        condition: formData.condition,
        neighborhood: formData.neighborhood,
        google_books_id: selectedBook.id,
      };

      console.log(`Submitting book data as ${bookType} book:`, bookData);
      
      if (bookType === "have") {
        // Add to books the user has
        const bookWithOwner = {
          ...bookData,
          owner: {
            id: user.uid,
            name: user.email || user.displayName || "Anonymous",
            neighborhood: formData.neighborhood
          }
        };
        await addBook(bookWithOwner);
        toast.success("Book added to your collection!");
      } else {
        // Add to books the user wants
        const wantedBook = {
          ...bookData,
          user_id: user.uid
        };
        await addWantedBook(wantedBook);
        toast.success("Book added to your want list!");
      }

      console.log('Book added successfully');
      navigate("/my-books");
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(`Error adding book: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-container max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Add Your Book</h1>
        
        {/* Book Type Selection */}
        <div className="mb-8 bg-muted/30 p-4 rounded-lg border">
          <Label className="text-lg font-medium mb-3 block">What would you like to do?</Label>
          <RadioGroup 
            value={bookType} 
            onValueChange={(value) => setBookType(value as "have" | "want")}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className={`flex items-start space-x-2 border rounded-lg p-3 ${bookType === "have" ? "bg-primary/10 border-primary" : "bg-white"}`}>
              <RadioGroupItem value="have" id="have" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="have" className="text-base font-medium flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Add a book I have
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a book to your collection that you're willing to swap with others
                </p>
              </div>
            </div>
            
            <div className={`flex items-start space-x-2 border rounded-lg p-3 ${bookType === "want" ? "bg-primary/10 border-primary" : "bg-white"}`}>
              <RadioGroupItem value="want" id="want" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="want" className="text-base font-medium flex items-center">
                  <BookPlus className="mr-2 h-5 w-5 text-primary" />
                  Add a book I want
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a book to your wishlist that you're looking to acquire
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="bg-white border border-border rounded-lg p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Book Search Section */}
              <div className="space-y-4">
                <Label>Search for your book</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, or ISBN"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4 border rounded-md divide-y">
                    {searchResults.map((book) => (
                      <div
                        key={book.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4"
                        onClick={() => handleBookSelect(book)}
                      >
                        {book.volumeInfo.imageLinks?.thumbnail && (
                          <img
                            src={book.volumeInfo.imageLinks.thumbnail}
                            alt={book.volumeInfo.title}
                            className="w-16 h-auto object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{book.volumeInfo.title}</h3>
                          {book.volumeInfo.authors && (
                            <p className="text-sm text-muted-foreground">
                              by {book.volumeInfo.authors.join(", ")}
                            </p>
                          )}
                          {book.volumeInfo.publishedDate && (
                            <p className="text-sm text-muted-foreground">
                              Published: {new Date(book.volumeInfo.publishedDate).getFullYear()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Book Display */}
                {selectedBook && (
                  <div className="mt-4 p-4 border rounded-md bg-muted/20">
                    <div className="flex items-start gap-4">
                      {selectedBook.volumeInfo.imageLinks?.thumbnail && (
                        <img
                          src={selectedBook.volumeInfo.imageLinks.thumbnail}
                          alt={selectedBook.volumeInfo.title}
                          className="w-20 h-auto"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium">{selectedBook.volumeInfo.title}</h3>
                        {selectedBook.volumeInfo.authors && (
                          <p className="text-sm text-muted-foreground">
                            by {selectedBook.volumeInfo.authors.join(", ")}
                          </p>
                        )}
                        {selectedBook.volumeInfo.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                            {selectedBook.volumeInfo.description}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          className="mt-2 h-8 text-sm"
                          onClick={() => setSelectedBook(null)}
                        >
                          Change Book
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Book Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map(condition => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Your Neighborhood *</Label>
                  <Select
                    value={formData.neighborhood}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, neighborhood: value }))}
                  >
                    <SelectTrigger id="neighborhood">
                      <SelectValue placeholder="Select neighborhood" />
                    </SelectTrigger>
                    <SelectContent>
                      {jerusalemNeighborhoods.map(neighborhood => (
                        <SelectItem key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
          <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!selectedBook || !formData.condition || !formData.neighborhood || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {bookType === "have" ? "Adding to Collection..." : "Adding to Want List..."}
                    </>
                  ) : (
                    bookType === "have" ? "Add Book to My Collection" : "Add Book to My Want List"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>All books added are available for swapping. There are no points or financial transactions.</p>
          <p>Book Swap Jerusalem is based on goodwill and community sharing.</p>
        </div>
      </div>
    </Layout>
  );
};

export default AddBook;
