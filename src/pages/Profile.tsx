import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { ImageUpload } from "@/components/profile/ImageUpload";
import { NeighborhoodSelect } from "@/components/profile/NeighborhoodSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    async function getProfile() {
      try {
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setNeighborhood(data.neighborhood ?? "");
          setAvatarUrl(data.avatar_url);
        } else {
          // Create a new profile document if it doesn't exist
          await setDoc(profileRef, {
            id: user.uid,
            display_name: "",
            bio: "",
            neighborhood: "",
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        toast.error("Error loading profile");
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [user, navigate]);

  async function updateProfile() {
    if (!user) return;

    try {
      const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(profileRef, {
        display_name: displayName,
        bio,
        neighborhood,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Error updating profile");
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="page-container">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container max-w-2xl mx-auto">
        <h1 className="section-heading">Profile Settings</h1>
        <div className="space-y-8">
          <div className="flex justify-center">
            <ImageUpload
              initialUrl={avatarUrl}
              onUpload={(url) => setAvatarUrl(url)}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio about yourself"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Neighborhood
              </label>
              <NeighborhoodSelect
                value={neighborhood}
                onSelect={setNeighborhood}
              />
            </div>

            <Button onClick={updateProfile} className="w-full">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
