import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react"; // Renamed to avoid conflict if User type is imported
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface ImageUploadProps {
  initialUrl?: string | null;
  onUpload: (url: string) => void;
  // cloudFunctionUrl prop is no longer needed as the API route handles the destination
}

// DEFAULT_CLOUD_FUNCTION_URL is no longer needed here, it's in the API route

export function ImageUpload({
  initialUrl,
  onUpload,
}: ImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);

  const uploadAvatar = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user) {
        toast.error("You must be logged in to upload an image.");
        return;
      }

      if (!event.target.files || event.target.files.length === 0) {
        toast.error("You must select an image to upload.");
        return;
      }

      const file = event.target.files[0];
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("profileImage", file); // Field name expected by the API route

        // The new upload URL is our Next.js API proxy route
        // Pass userId as a query parameter to the API route
        const uploadUrl = `/api/upload-profile-image?userId=${user.uid}`;

        const token = await user.getIdToken();

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
          headers: {
            // Pass the Firebase Auth ID token in the Authorization header
            // The Next.js API route will forward this to the Cloud Function
            "Authorization": `Bearer ${token}`,
          },
        });

        // Attempt to parse error message from backend, otherwise use statusText
        // This logic remains the same as the API route should mirror the Cloud Function's response structure on success/failure
        const responseData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));

        if (!response.ok) {
          throw new Error(`Upload failed: ${responseData.message || response.statusText}`);
        }
        
        // Assuming the proxy returns the same JSON structure with imageUrl
        const newAvatarUrl = responseData.imageUrl;
        if (!newAvatarUrl) {
            // If imageUrl is not in the response, it might be nested or the proxy returned an unexpected success format
            console.error("Unexpected response structure from proxy:", responseData);
            throw new Error("Upload succeeded but imageUrl was not found in the response.");
        }

        setAvatarUrl(newAvatarUrl);
        onUpload(newAvatarUrl); // Callback to parent component with the new URL
        toast.success("Avatar uploaded successfully!");

      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        toast.error(error.message || "An unexpected error occurred during upload.");
      } finally {
        setIsUploading(false);
        // Reset file input to allow re-uploading the same file if needed
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [user, onUpload] // cloudFunctionUrl removed from dependencies
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32 cursor-pointer relative group">
        <AvatarImage src={avatarUrl ?? ""} alt="User avatar" />
        <AvatarFallback>
          <UserIcon className="h-16 w-16" />
        </AvatarFallback>
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
          <span className="text-white text-sm">Change Photo</span>
        </div>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*" // Accept all image types
          disabled={isUploading}
          onChange={uploadAvatar}
          aria-label="Upload profile photo"
        />
      </Avatar>
      {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
    </div>
  );
}

