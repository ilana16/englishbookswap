import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { uploadFile } from "@/integrations/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface ImageUploadProps {
  initialUrl?: string | null;
  onUpload: (url: string) => void;
}

export function ImageUpload({ initialUrl, onUpload }: ImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);

  const uploadAvatar = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setIsUploading(true);
        
        if (!event.target.files || event.target.files.length === 0) {
          throw new Error("You must select an image to upload.");
        }

        const file = event.target.files[0];
        const fileExt = file.name.split(".").pop();
        const filePath = `profile-pictures/${user?.uid}/avatar.${fileExt}`;

        const publicUrl = await uploadFile(file, filePath);

        setAvatarUrl(publicUrl);
        onUpload(publicUrl);
      } catch (error) {
        toast.error("Error uploading avatar!");
      } finally {
        setIsUploading(false);
      }
    },
    [user, onUpload]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32 cursor-pointer relative group">
        <AvatarImage src={avatarUrl ?? ""} />
        <AvatarFallback>
          <User className="h-16 w-16" />
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
        />
      </Avatar>
      {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
    </div>
  );
}
