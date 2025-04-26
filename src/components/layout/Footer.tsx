
import { Link } from "react-router-dom";
import { SafetyDisclaimer } from "../common/SafetyDisclaimer";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <SafetyDisclaimer />
        
        <div className="flex flex-col md:flex-row justify-between items-center mt-8 pt-6 border-t border-border">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} English Book Swap Jerusalem
            </p>
          </div>
          
          <div className="flex space-x-4">
            <Link to="/about" className="text-sm text-muted-foreground hover:underline">
              About
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:underline">
              FAQ
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:underline">
              Contact
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
