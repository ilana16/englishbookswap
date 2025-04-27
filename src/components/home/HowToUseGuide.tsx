import { 
  BookOpen, 
  UserPlus, 
  Search, 
  MessageSquare, 
  MapPin, 
  BookPlus,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HowToUseGuide() {
  return (
    <div className="bg-white py-12 md:py-16 border-y border-border">
      <div className="page-container">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">How to Use English Book Swap Jerusalem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform makes it easy to share and discover English books in Jerusalem. 
            Follow these simple steps to get started.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Step 1 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">1. Create an Account</h3>
              <p className="text-muted-foreground mb-3">
                Sign up using your email or Google account. This allows you to add books, 
                message other users, and keep track of your swaps.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Sign Up Now</Link>
              </Button>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">2. Add Books You Have</h3>
              <p className="text-muted-foreground mb-3">
                List books you're willing to swap. Search by title or author, select the condition, 
                and add your neighborhood for local matching.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/add">Add Your Books</Link>
              </Button>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <BookPlus className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">3. Add Books You Want</h3>
              <p className="text-muted-foreground mb-3">
                Create your wishlist by adding books you're looking for. This helps our system 
                find perfect matches with other users.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/add?type=want">Add Wanted Books</Link>
              </Button>
            </div>
          </div>
          
          {/* Step 4 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <Search className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">4. Browse Available Books</h3>
              <p className="text-muted-foreground mb-3">
                Explore books that other users have added. Filter by neighborhood to find books 
                close to you for easier meetups.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/books">Browse Books</Link>
              </Button>
            </div>
          </div>
          
          {/* Step 5 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <Users className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">5. Find Your Matches</h3>
              <p className="text-muted-foreground mb-3">
                Our system automatically finds users who have books you want or want books you have. 
                Check your matches regularly for new swap opportunities.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/matches">View Matches</Link>
              </Button>
            </div>
          </div>
          
          {/* Step 6 */}
          <div className="flex gap-4 p-6 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-bookswap-blue flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-bookswap-darkblue" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">6. Message & Arrange Meetup</h3>
              <p className="text-muted-foreground mb-3">
                Contact your matches through our messaging system. Discuss the books and arrange 
                a convenient time and place to meet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/chat">Messages</Link>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-10 p-6 border rounded-lg bg-bookswap-stone/20 text-center">
          <h3 className="text-xl font-bold mb-2">Safety Tips for Book Swaps</h3>
          <ul className="text-muted-foreground max-w-2xl mx-auto text-left space-y-2 mb-4">
            <li className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5 text-bookswap-darkblue" />
              <span>Meet in public places like cafés or libraries</span>
            </li>
            <li className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5 text-bookswap-darkblue" />
              <span>Consider daytime meetups for better visibility</span>
            </li>
            <li className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5 text-bookswap-darkblue" />
              <span>Let someone know where you're going for your book swap</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Remember: English Book Swap Jerusalem is based on community trust and goodwill. 
            There are no financial transactions or point systems.
          </p>
        </div>
      </div>
    </div>
  );
}
