import { Link } from "react-router-dom";
import { Book, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/integrations/firebase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

        <div className="flex items-center space-x-2">
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
    </header>
  );
}
