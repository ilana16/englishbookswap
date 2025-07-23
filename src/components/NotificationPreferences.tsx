import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { Loader2, Mail, Bell, MessageSquare, BookOpen } from 'lucide-react';

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_notifications: {
    new_matches: boolean;
    book_availability: boolean;
    new_messages: boolean;
  };
  created_at: any;
  updated_at: any;
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const prefsQuery = query(
        collection(db, 'notification_preferences'),
        where('user_id', '==', user.uid)
      );
      const querySnapshot = await getDocs(prefsQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setPreferences({ id: doc.id, ...doc.data() } as NotificationPreferences);
      } else {
        // Set default preferences
        setPreferences({
          user_id: user.uid,
          email_notifications: {
            new_matches: true,
            book_availability: true,
            new_messages: true
          },
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user || !preferences) return;
    
    setIsSaving(true);
    try {
      if (preferences.id) {
        // Update existing preferences
        await updateDoc(doc(db, 'notification_preferences', preferences.id), {
          email_notifications: preferences.email_notifications,
          updated_at: serverTimestamp()
        });
      } else {
        // Create new preferences
        const docRef = await addDoc(collection(db, 'notification_preferences'), {
          user_id: user.uid,
          email_notifications: preferences.email_notifications,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        setPreferences(prev => prev ? { ...prev, id: docRef.id } : null);
      }
      
      toast.success('Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences['email_notifications'], value: boolean) => {
    if (!preferences) return;
    
    setPreferences(prev => prev ? {
      ...prev,
      email_notifications: {
        ...prev.email_notifications,
        [key]: value
      }
    } : null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading preferences...</span>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Failed to load notification preferences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which email notifications you'd like to receive to stay updated on your book swaps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="new-matches" className="text-base font-medium">
                  New Matches
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone wants a book you have or when you want a book that becomes available.
                </p>
              </div>
            </div>
            <Switch
              id="new-matches"
              checked={preferences.email_notifications.new_matches}
              onCheckedChange={(checked) => updatePreference('new_matches', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="book-availability" className="text-base font-medium">
                  Book Availability
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when books from your want list become available from other users.
                </p>
              </div>
            </div>
            <Switch
              id="book-availability"
              checked={preferences.email_notifications.book_availability}
              onCheckedChange={(checked) => updatePreference('book_availability', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="new-messages" className="text-base font-medium">
                  New Messages
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive new messages from other book swappers.
                </p>
              </div>
            </div>
            <Switch
              id="new-messages"
              checked={preferences.email_notifications.new_messages}
              onCheckedChange={(checked) => updatePreference('new_messages', checked)}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={savePreferences} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          <p>You can change these settings at any time. All emails include an unsubscribe link.</p>
        </div>
      </CardContent>
    </Card>
  );
};

