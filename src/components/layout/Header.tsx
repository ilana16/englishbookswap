import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Book, BookUser, LogOut, Menu, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/integrations/firebase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Book className="h-6 w-6 text-bookswap-darkblue" />
          <Link to="/" className="font-playfair font-bold text-xl md:text-2xl text-bookswap-darkblue">
            English Book Swap Jerusalem
          </Link>
        </div>

        {isMobile ? (
          <>
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
            {mobileMenuOpen && (
              <div className="absolute top-16 left-0 right-0 bg-white border-b border-border p-4 shadow-lg animate-fade-in">
                <nav className="flex flex-col space-y-4">
                  <Link to="/" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    Home
                  </Link>
                  <Link to="/books" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    Browse Books
                  </Link>
                  <Link to="/add" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    Add Book
                  </Link>
                  <Link to="/my-books" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    <BookUser className="mr-2 h-4 w-4 inline" />
                    My Books
                  </Link>
                  <Link to="/matches" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    Matches
                  </Link>
                  <Link to="/chat" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                    Messages
                  </Link>
                  {user && (
                    <Link to="/profile" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                      My Profile
                    </Link>
                  )}
                  {user ? (
                    <Button variant="ghost" onClick={handleLogout} className="justify-start">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  ) : (
                    <Link to="/auth" className="px-4 py-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="flex space-x-2">
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                Home
              </Link>
              <Link to="/books" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                Browse Books
              </Link>
              <Link to="/add" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                Add Book
              </Link>
              <Link to="/my-books" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                My Books
              </Link>
              <Link to="/matches" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                Matches
              </Link>
              <Link to="/chat" className="px-3 py-2 hover:bg-muted rounded-md text-sm">
                Messages
              </Link>
            </nav>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/profile">
                      <User className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="default" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
