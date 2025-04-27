import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, BookUser, Users, MessageSquare, User, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/integrations/firebase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (!user) {
    return null; // Don't show bottom navigation when user is not logged in
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-2">
        <Link 
          to="/" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5 mb-1" />
          <span>Home</span>
        </Link>
        
        <Link 
          to="/books" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/books") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <BookOpen className="h-5 w-5 mb-1" />
          <span>Browse</span>
        </Link>
        
        <Link 
          to="/my-books" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/my-books") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <BookUser className="h-5 w-5 mb-1" />
          <span>My Books</span>
        </Link>
        
        <Link 
          to="/matches" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/matches") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Users className="h-5 w-5 mb-1" />
          <span>Matches</span>
        </Link>
        
        <Link 
          to="/chat" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/chat") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MessageSquare className="h-5 w-5 mb-1" />
          <span>Messages</span>
        </Link>
        
        <Link 
          to="/profile" 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full text-xs",
            isActive("/profile") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <User className="h-5 w-5 mb-1" />
          <span>Profile</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full h-full text-xs text-muted-foreground"
        >
          <LogOut className="h-5 w-5 mb-1" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
