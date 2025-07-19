import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getChats, getMessages, sendMessage, getCurrentUser } from "@/integrations/firebase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";

interface ChatContact {
  id: string;
  name: string;
  lastMessage: string | null;
  lastMessageTime: string;
  unread: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: string;
  sender_id: string;
}

const Chat = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(chatId || null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading, error } = useQuery<ChatContact[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      
      const userId = user.uid;
      const chatsData = await getChats(userId);

      return chatsData.map(chat => ({
        id: chat.id,
        name: chat.participants?.find(p => p !== userId) || "Unknown",
        lastMessage: chat.last_message || "No messages yet",
        lastMessageTime: chat.updated_at ? new Date(chat.updated_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "",
        unread: chat.unread || false
      }));
    }
  });

  useEffect(() => {
    if (chatId) {
      setSelectedContactId(chatId);
    } else if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, chatId]);

  // Load messages when a contact is selected
  useEffect(() => {
    if (!selectedContactId) return;
    
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const user = getCurrentUser();
        if (!user) throw new Error("Not authenticated");
        
        // Set up real-time listener for messages
        const messagesRef = collection(db, COLLECTIONS.MESSAGES);
        const q = query(
          messagesRef,
          where("chat_id", "==", selectedContactId),
          orderBy("created_at", "asc")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.content || "",
              sender: data.sender_id === user.uid ? "user" : "other",
              timestamp: data.created_at ? new Date(data.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "",
              sender_id: data.sender_id
            };
          });
          setMessages(newMessages);
          setIsLoadingMessages(false);
        });
        
        // Clean up listener on unmount or when contact changes
        return () => unsubscribe();
      } catch (err) {
        console.error("Error loading messages:", err);
        setIsLoadingMessages(false);
        toast({
          title: "Error loading messages",
          description: "Unable to load messages. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    loadMessages();
  }, [selectedContactId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedContactId) return;
    
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      
      // Call sendMessage with the correct parameter structure
      await sendMessage(selectedContactId, messageText, user.uid);
      
      // Clear the input
      setMessageText("");
      
      // Invalidate queries to refresh chat list
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err) {
      toast({
        title: "Error sending message",
        description: "Unable to send message. Please try again.",
        variant: "destructive"
      });
      console.error(err);
    }
  };

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="page-container">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bookswap-darkblue"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="page-container">
          <div className="text-center py-12">
            <p className="text-lg text-red-600">Error loading chats</p>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container max-w-6xl mx-auto">
        <h1 className="section-heading">Messages</h1>

        <div className="bg-white border border-border rounded-lg overflow-hidden min-h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Contact list sidebar */}
            <div className="md:col-span-1 border-r border-border">
              <div className="p-4 border-b border-border">
                <h2 className="font-medium">Your Conversations</h2>
              </div>
              
              <div className="divide-y divide-border">
                {contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedContactId === contact.id
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-bookswap-blue text-bookswap-darkblue flex items-center justify-center font-bold text-lg mr-3">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium truncate">
                              {contact.name}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                              {contact.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.lastMessage}
                          </p>
                        </div>
                        {contact.unread && (
                          <div className="w-2 h-2 bg-bookswap-darkblue rounded-full ml-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No conversations yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="md:col-span-2 flex flex-col h-full">
              {selectedContact ? (
                <>
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-bookswap-blue text-bookswap-darkblue flex items-center justify-center font-bold text-sm mr-3">
                        {selectedContact.name.charAt(0)}
                      </div>
                      <h2 className="font-medium">{selectedContact.name}</h2>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bookswap-darkblue"></div>
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.sender === "user"
                                ? "bg-bookswap-darkblue text-white"
                                : "bg-muted"
                            }`}
                          >
                            <p>{message.text}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === "user"
                                ? "text-white/80"
                                : "text-muted-foreground"
                            }`}>
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-border">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        disabled={!messageText.trim()} 
                        className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-2">
                      Keep communication focused on book swaps and meeting arrangements.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <p className="text-muted-foreground mb-3">
                      Select a conversation or start a new one from your matches
                    </p>
                    <Button asChild className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
                      <Link to="/matches">Find Matches</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
