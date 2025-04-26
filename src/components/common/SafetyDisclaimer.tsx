
import { AlertCircle } from "lucide-react";

export function SafetyDisclaimer() {
  return (
    <div className="bg-muted rounded-md p-4 flex items-start space-x-3">
      <AlertCircle className="h-5 w-5 text-bookswap-darkblue shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-1">Safety First</p>
        <p>
          Book Swap Jerusalem is a goodwill-based platform. When meeting to exchange books, 
          please take common safety precautions: meet in public places during daylight hours, 
          tell someone where you're going, and trust your instincts. We recommend initial 
          meetings at cafés, libraries, or other public venues.
        </p>
      </div>
    </div>
  );
}
