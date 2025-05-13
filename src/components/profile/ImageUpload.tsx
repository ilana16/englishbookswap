import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react"; // Renamed to avoid conflict if User type is imported
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface ImageUploadProps {
  initialUrl?: string | null;
  onUpload: (url: string) => void;
  // In a real app, this URL should come from a config or environment variable
  cloudFunctionUrl?: string;
}

const DEFAULT_CLOUD_FUNCTION_URL = "https://us-central1-books-794a8.cloudfunctions.net/uploadProfilePicture";

export function ImageUpload({
  initialUrl,
  onUpload,
  cloudFunctionUrl = DEFAULT_CLOUD_FUNCTION_URL
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
        formData.append("profileImage", file); // "profileImage" is the fieldname the Cloud Function expects

        // Pass userId as a query parameter
        const uploadUrl = `${cloudFunctionUrl}?userId=${user.uid}`;

        // Get the Firebase Auth ID token for secure backend authentication
        const token = await user.getIdToken();

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
          headers: {
            // Pass the Firebase Auth ID token in the Authorization header
            // The backend (Cloud Function) should verify this token
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Attempt to parse error message from backend, otherwise use statusText
          const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
          throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        const newAvatarUrl = result.imageUrl;

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
    [user, onUpload, cloudFunctionUrl] // Dependencies for useCallback
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

