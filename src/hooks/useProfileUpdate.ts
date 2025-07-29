import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/config';

export const useProfileUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfileWithEmail = async (userId: string) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated or ID mismatch');
      }

      if (!currentUser.email) {
        throw new Error('No email found for current user');
      }

      // Update the profile document with the user's email
      const profileRef = doc(db, 'profiles', userId);
      await updateDoc(profileRef, {
        email: currentUser.email,
        updated_at: serverTimestamp()
      });

      console.log('Profile updated with email:', currentUser.email);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('Error updating profile with email:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateProfileWithEmail,
    isUpdating,
    error
  };
};

