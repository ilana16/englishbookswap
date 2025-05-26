import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react"; // Renamed to avoid conflict if User type is imported
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { uploadProfilePictureViaFunction } from "@/integrations/firebase/client";

interface ImageUploadProps {
  initialUrl?: string | null;
  onUpload: (url: string) => void;
}

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
        // Use the Firebase Cloud Function utility instead of direct Netlify function call
        const newAvatarUrl = await uploadProfilePictureViaFunction(file, user.uid);
        
        setAvatarUrl(newAvatarUrl);
        onUpload(newAvatarUrl);
        toast.success("Avatar uploaded successfully!");

      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        toast.error(error.message || "An unexpected error occurred during upload.");
      } finally {
        setIsUploading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [user, onUpload]
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
          accept="image/*"
          disabled={isUploading}
          onChange={uploadAvatar}
          aria-label="Upload profile photo"
        />
      </Avatar>
      {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
    </div>
  );
}
