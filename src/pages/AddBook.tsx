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
import { addBook, addWantedBook } from "@/integrations/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { shouldSendNotification } from "@/utils/notificationHelper";
import { sendImmediateNotification } from "@/utils/immediateNotificationService";

const baseConditions = ["Like New", "Very Good", "Good", "Fair", "Poor"];
const noPreferenceCondition = "No Preference";

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
  const [userNeighborhood, setUserNeighborhood] = useState<string>("");
  const [formData, setFormData] = useState({
    condition: "",
  });
  const [currentConditions, setCurrentConditions] = useState<string[]>(baseConditions);

  useEffect(() => {
    if (bookType === "want") {
      setCurrentConditions([...baseConditions, noPreferenceCondition]);
    } else {
      setCurrentConditions(baseConditions);
      // If switching from 'want' to 'have' and 'No Preference' was selected, reset condition
      if (formData.condition === noPreferenceCondition) {
        setFormData(prev => ({ ...prev, condition: "" }));
      }
    }
  }, [bookType, formData.condition]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    async function fetchProfileNeighborhood() {
      try {
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          if (profileData.neighborhood) {
            setUserNeighborhood(profileData.neighborhood);
          } else {
            toast.error("Please set your default neighborhood in your profile first.");
            navigate("/profile");
          }
        } else {
          toast.error("Profile not found. Please complete your profile.");
          navigate("/profile");
        }
      } catch (error) {
        toast.error("Error fetching your neighborhood from profile.");
        console.error("Error fetching profile neighborhood:", error);
      }
    }

    fetchProfileNeighborhood();
  }, [user, navigate]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get("type");
    if (typeParam === "want") {
      setBookType("want");
    }
  }, [location]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchBooks(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error searching for books");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookSelect = (book: GoogleBook) => {
    setSelectedBook(book);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let conditionToSave = formData.condition;
    if (bookType === "want" && formData.condition === noPreferenceCondition) {
      conditionToSave = "any";
    }

    if (!selectedBook || !conditionToSave || !user || !userNeighborhood) {
      if (!userNeighborhood) {
        toast.error("Your default neighborhood is not set. Please update your profile.");
      } else if (!conditionToSave) {
        toast.error("Please select a book condition.");
      } else {
        toast.error("Please fill in all required fields and ensure your neighborhood is set in your profile.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const coverColor = selectedBook.volumeInfo.imageLinks?.thumbnail 
        ? "#" + selectedBook.id.slice(0, 6) 
        : "#436B95";
        
      const bookData = {
        title: selectedBook.volumeInfo.title,
        author: selectedBook.volumeInfo.authors?.[0] || "Unknown Author",
        description: selectedBook.volumeInfo.description || "",
        cover_color: coverColor,
        condition: conditionToSave, // Use modified condition
        neighborhood: userNeighborhood,
        google_books_id: selectedBook.id,
        genres: selectedBook.volumeInfo.categories || [],
      };

      if (bookType === "have") {
        const bookWithOwner = {
          ...bookData,
          owner: {
            id: user.uid,
            name: user.email || user.displayName || "Anonymous",
            neighborhood: userNeighborhood
          }
        };
        const bookId = await addBook(bookWithOwner);
        
        // Send email notification to users who want this book and have notifications enabled
        try {
          // Find users who want this book in the same neighborhood
          const wantedBooksQuery = query(
            collection(db, COLLECTIONS.WANTED_BOOKS),
            where("title", "==", selectedBook.volumeInfo.title),
            where("neighborhood", "==", userNeighborhood)
          );
          
          const wantedBooksSnapshot = await getDocs(wantedBooksQuery);
          
          // Send notifications to each user who wants this book
          for (const wantedBookDoc of wantedBooksSnapshot.docs) {
            const wantedBookData = wantedBookDoc.data();
            const userId = wantedBookData.user_id;
            
            // Skip if it's the same user adding the book
            if (userId === user?.uid) continue;
            
            // Check if user wants book availability notifications
            const { shouldSend, email } = await shouldSendNotification(userId, 'book_availability');
            
            // Use immediate notification system for instant delivery
            const notificationSent = await sendImmediateNotification('book_availability', email, shouldSend, userId);
            
            if (notificationSent) {
              console.log(`🚀 Immediate book availability notification sent to user ${userId}`);
            } else {
              console.warn(`⚠️ Failed to send immediate book availability notification to user ${userId}`);
            }
          }
        } catch (emailError) {
          console.error('Error sending book availability notifications:', emailError);
          // Don't fail the book addition if email fails
        }
        
        toast.success("Book added to your collection!");
      } else {
        const wantedBookData = {
            title: selectedBook.volumeInfo.title,
            author: selectedBook.volumeInfo.authors?.[0] || "Unknown Author",
            description: selectedBook.volumeInfo.description || "",
            google_books_id: selectedBook.id,
            user_id: user.uid,
            condition: conditionToSave, // Use modified condition for wanted book
            neighborhood: userNeighborhood,
            genres: selectedBook.volumeInfo.categories || [],
            // cover_color is not in WantedBook interface in types.ts, but it was in bookData. 
            // For now, I will not include it, but this might need to be revisited if it's an oversight.
        };
        await addWantedBook(wantedBookData);
        toast.success("Book added to your want list!");
      }

      navigate("/my-books");
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(`Error adding book: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-container max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Add Your Book</h1>
        
        <div className="mb-8 bg-muted/30 p-4 rounded-lg border">
          <Label className="text-lg font-medium mb-3 block">What would you like to do?</Label>
          <RadioGroup 
            value={bookType} 
            onValueChange={(value) => {
              setBookType(value as "have" | "want");
              // Reset condition if switching types and current condition is not valid for new type
              if (value === "have" && formData.condition === noPreferenceCondition) {
                setFormData(prev => ({ ...prev, condition: ""}));
              }
            }}
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
                  Add a book to your collection that you are willing to swap with others
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
                  Add a book to your wishlist that you are looking to acquire
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="bg-white border border-border rounded-lg p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
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
                      {currentConditions.map(condition => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {userNeighborhood && (
                    <div>
                        <Label className="block text-sm font-medium mb-1">Your Default Neighborhood (from profile)</Label>
                        <p className="text-md p-2 border rounded-md bg-muted/50">{userNeighborhood}</p>
                    </div>
                )}
              </div>
              
          <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!selectedBook || !formData.condition || !userNeighborhood || isSubmitting}
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

