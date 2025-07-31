import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "firebase/firestore"; // Added serverTimestamp
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { NeighborhoodSelect } from "@/components/profile/NeighborhoodSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [originalNeighborhood, setOriginalNeighborhood] = useState<string>("");
  const [receiveEmailNotifications, setReceiveEmailNotifications] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    async function getProfile() {
      setLoading(true);
      try {
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setNeighborhood(data.neighborhood ?? "");
          setOriginalNeighborhood(data.neighborhood ?? ""); // Store initial neighborhood
          setReceiveEmailNotifications(data.email_notifications?.new_messages ?? true); // Load preference
          
          // Check if email is missing and add it
          if (!data.email && user.email) {
            console.log("Adding email to existing profile:", user.email);
            await updateDoc(profileRef, {
              email: user.email,
              updated_at: serverTimestamp()
            });
          }
        } else {
          await setDoc(profileRef, {
            id: user.uid,
            display_name: "",
            bio: "",
            neighborhood: "",
            email: user.email || "", // Add email to new profile
            email_notifications: {
              new_matches: true,
              book_availability: true,
              new_messages: true,
            },
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          setOriginalNeighborhood(""); // Set for new profile
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Error loading profile");
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [user, navigate]);

  async function updateProfile() {
    if (!user || !neighborhood) { // Ensure neighborhood is set
        toast.error("Neighborhood cannot be empty. Please select a neighborhood.");
        return;
    }
    setLoading(true);
    try {
      const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(profileRef, {
        display_name: displayName,
        bio,
        neighborhood, // new neighborhood value
        email: user.email || "", // Ensure email is always synced
        email_notifications: {
          new_matches: receiveEmailNotifications,
          book_availability: receiveEmailNotifications,
          new_messages: receiveEmailNotifications,
        },
        updated_at: serverTimestamp(),
      });
      toast.success("Profile updated successfully");

      // Check if neighborhood has changed and update books if so
      if (neighborhood !== originalNeighborhood) {
        toast.info("Updating neighborhood for your books...");
        const batch = writeBatch(db);

        // Update books in "books" collection (user's owned books)
        const booksQuery = query(collection(db, COLLECTIONS.BOOKS), where("owner.id", "==", user.uid));
        const booksSnapshot = await getDocs(booksQuery);
        booksSnapshot.forEach((bookDoc) => {
          const bookRef = doc(db, COLLECTIONS.BOOKS, bookDoc.id);
          batch.update(bookRef, { 
            neighborhood: neighborhood,
            "owner.neighborhood": neighborhood // Update nested neighborhood in owner object
          });
        });

        // Update books in "wanted_books" collection
        const wantedBooksQuery = query(collection(db, COLLECTIONS.WANTED_BOOKS), where("user_id", "==", user.uid));
        const wantedBooksSnapshot = await getDocs(wantedBooksQuery);
        wantedBooksSnapshot.forEach((bookDoc) => {
          const bookRef = doc(db, COLLECTIONS.WANTED_BOOKS, bookDoc.id);
          batch.update(bookRef, { neighborhood: neighborhood });
        });

        await batch.commit();
        setOriginalNeighborhood(neighborhood); // Update original neighborhood to current
        toast.success("Neighborhood for all your books has been updated.");
      }

    } catch (error) {
      console.error("Error updating profile or books:", error);
      toast.error("Error updating profile or books. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !user) { // Adjusted loading condition slightly for initial load before user is confirmed
    return (
      <Layout>
        <div className="page-container flex justify-center items-center min-h-[calc(100vh-200px)]">
          <p>Loading user data...</p>
        </div>
      </Layout>
    );
  }
  
  if (loading && user) {
    return (
      <Layout>
        <div className="page-container flex justify-center items-center min-h-[calc(100vh-200px)]">
          <p>Loading profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container max-w-2xl mx-auto">
        <h1 className="section-heading">Profile Settings</h1>
        <div className="space-y-8">
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
                Default Neighborhood (this will apply to all your books)
              </label>
              <NeighborhoodSelect
                value={neighborhood}
                onSelect={setNeighborhood}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailNotifications"
                checked={receiveEmailNotifications}
                onCheckedChange={setReceiveEmailNotifications}
              />
              <label
                htmlFor="emailNotifications"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I want to receive email notifications about messages, matches, and books on my want list
              </label>
            </div>

            <Button onClick={updateProfile} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
