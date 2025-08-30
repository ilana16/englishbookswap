import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, User, ArrowLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getChats, getMessages, sendMessage, getCurrentUser } from "@/integrations/firebase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { onSnapshot, collection, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { COLLECTIONS } from "@/integrations/firebase/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatContact {
  id: string;
  name: string;
  displayName?: string;
  lastMessage: string | null;
  lastMessageTime: string;
  unread: boolean;
  otherUserId: string;
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(chatId || null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showChatView, setShowChatView] = useState(false); // For mobile navigation
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading, error } = useQuery<ChatContact[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      
      const userId = user.uid;
      const chatsData = await getChats(userId);

      // Get user display names for each chat
      const contactsWithNames = await Promise.all(
        chatsData.map(async (chat) => {
          const otherUserId = chat.participants?.find(p => p !== userId);
          let displayName = "Unknown User";
          
          if (otherUserId) {
            try {
              const userDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                displayName = userData.display_name || userData.username || "Unknown User";
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
            }
          }

          return {
            id: chat.id,
            name: displayName,
            displayName: displayName,
            otherUserId: otherUserId || "",
            lastMessage: chat.last_message || "No messages yet",
            lastMessageTime: chat.updated_at ? new Date(chat.updated_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "",
            unread: chat.unread || false
          };
        })
      );

      return contactsWithNames;
    }
  });

  useEffect(() => {
    if (chatId) {
      setSelectedContactId(chatId);
      if (isMobile) {
        setShowChatView(true); // Show chat view on mobile when chatId is present
      }
    } else if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
      if (isMobile) {
        setShowChatView(false); // Show conversation list on mobile when no chatId
      }
    }
  }, [contacts, chatId, isMobile]);

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

  const handleTabClick = (contactId: string) => {
    setSelectedContactId(contactId);
    // Update URL to reflect the selected chat
    navigate(`/chat/${contactId}`, { replace: true });
    
    // On mobile, switch to chat view when a contact is selected
    if (isMobile) {
      setShowChatView(true);
    }
  };

  const handleBackToContacts = () => {
    if (isMobile) {
      setShowChatView(false);
      navigate('/chat', { replace: true });
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
      <div className="page-container max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-bookswap-darkblue" />
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>

        <div className="bg-white border border-border rounded-lg overflow-hidden min-h-[600px] shadow-sm">
          <div className="flex h-full">
            {/* Conversation List - Show on desktop or mobile when showChatView is false */}
            <div className={`${
              isMobile 
                ? (showChatView ? 'hidden' : 'w-full') 
                : 'w-80'
            } border-r border-border bg-gray-50/50 ${isMobile ? '' : 'flex-shrink-0'}`}>
              <div className="p-4 border-b border-border bg-white">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Conversations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {contacts.length} active conversation{contacts.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(600px-80px)]">
                {contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${
                        selectedContactId === contact.id
                          ? "bg-bookswap-blue/10 border-l-bookswap-darkblue shadow-sm"
                          : "border-l-transparent hover:bg-gray-100/70"
                      }`}
                      onClick={() => handleTabClick(contact.id)}
                    >
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-3 ${
                          selectedContactId === contact.id
                            ? "bg-bookswap-darkblue text-white"
                            : "bg-bookswap-blue text-bookswap-darkblue"
                        }`}>
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className={`font-medium truncate ${
                              selectedContactId === contact.id
                                ? "text-bookswap-darkblue"
                                : "text-gray-900"
                            }`}>
                              {contact.name}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {contact.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.lastMessage}
                          </p>
                        </div>
                        {contact.unread && (
                          <div className="w-3 h-3 bg-bookswap-darkblue rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      No conversations yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start messaging other users about book swaps
                    </p>
                    <Button asChild className="mt-4 bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
                      <Link to="/books">Browse Books</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat View - Show on desktop or mobile when showChatView is true */}
            <div className={`${
              isMobile 
                ? (showChatView ? 'w-full' : 'hidden') 
                : 'flex-1'
            } flex flex-col`}>
              {selectedContact ? (
                <>
                  {/* Chat Header with Back Button for Mobile */}
                  <div className="p-4 border-b border-border bg-white">
                    <div className="flex items-center">
                      {isMobile && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleBackToContacts}
                          className="mr-3"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="w-10 h-10 rounded-full bg-bookswap-darkblue text-white flex items-center justify-center font-bold text-lg mr-3">
                        {selectedContact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">{selectedContact.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          Book swap conversation
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bookswap-darkblue mx-auto mb-2"></div>
                          <p className="text-muted-foreground">Loading messages...</p>
                        </div>
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
                            className={`${isMobile ? 'max-w-[85%]' : 'max-w-[75%]'} rounded-2xl px-4 py-3 shadow-sm ${
                              message.sender === "user"
                                ? "bg-bookswap-darkblue text-white"
                                : "bg-white border border-gray-200"
                            }`}
                          >
                            <p className="text-sm leading-relaxed break-words">{message.text}</p>
                            <p className={`text-xs mt-2 ${
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
                        <div className="text-center">
                          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground font-medium">No messages yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Start the conversation about your book swap!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border bg-white">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={`Message ${selectedContact.name}...`}
                        className="flex-1 rounded-full px-4"
                      />
                      <Button 
                        type="submit" 
                        disabled={!messageText.trim()} 
                        className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90 rounded-full px-6"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Keep communication focused on book swaps and meeting arrangements.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                  <div className="text-center p-8">
                    <MessageCircle className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Choose a conversation from the sidebar to start messaging, or find new matches to begin swapping books.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button asChild className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90">
                        <Link to="/matches">Find Matches</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/books">Browse Books</Link>
                      </Button>
                    </div>
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
