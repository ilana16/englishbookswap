import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "./config";
import { COLLECTIONS } from "./types";

// Function to add a book the user has
export const addBook = async (bookData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const bookWithMetadata = {
      ...bookData,
      owner: {
        id: user.uid,
        name: user.displayName || "Anonymous",
        neighborhood: bookData.neighborhood || "Unknown"
      },
      book_type: 'have',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.BOOKS), bookWithMetadata);
    return { id: docRef.id, ...bookWithMetadata };
  } catch (error) {
    console.error("Error adding book:", error);
    throw error;
  }
};

// Function to add a book the user wants
export const addWantedBook = async (bookData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const wantedBookWithMetadata = {
      ...bookData,
      user_id: user.uid,
      book_type: 'want',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.WANTED_BOOKS), wantedBookWithMetadata);
    return { id: docRef.id, ...wantedBookWithMetadata };
  } catch (error) {
    console.error("Error adding wanted book:", error);
    throw error;
  }
};

// Function to update a book
export const updateBook = async (id, bookData) => {
  try {
    const bookRef = doc(db, COLLECTIONS.BOOKS, id);
    await updateDoc(bookRef, {
      ...bookData,
      updated_at: serverTimestamp()
    });
    return { id, ...bookData };
  } catch (error) {
    console.error("Error updating book:", error);
    throw error;
  }
};

// Function to update a wanted book
export const updateWantedBook = async (id, bookData) => {
  try {
    const bookRef = doc(db, COLLECTIONS.WANTED_BOOKS, id);
    await updateDoc(bookRef, {
      ...bookData,
      updated_at: serverTimestamp()
    });
    return { id, ...bookData };
  } catch (error) {
    console.error("Error updating wanted book:", error);
    throw error;
  }
};

// Function to delete a book
export const deleteBook = async (id) => {
  try {
    const bookRef = doc(db, COLLECTIONS.BOOKS, id);
    await deleteDoc(bookRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting book:", error);
    throw error;
  }
};

// Function to delete a wanted book
export const deleteWantedBook = async (id) => {
  try {
    const bookRef = doc(db, COLLECTIONS.WANTED_BOOKS, id);
    await deleteDoc(bookRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting wanted book:", error);
    throw error;
  }
};

// Function to get books by user ID
export const getBooksByUser = async (userId) => {
  try {
    const booksRef = collection(db, COLLECTIONS.BOOKS);
    const q = query(booksRef, where("owner.id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting books by user:", error);
    throw error;
  }
};

// Function to get wanted books by user ID
export const getWantedBooksByUser = async (userId) => {
  try {
    const booksRef = collection(db, COLLECTIONS.WANTED_BOOKS);
    const q = query(booksRef, where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting wanted books by user:", error);
    throw error;
  }
};

// Function to find potential matches for a user
export const findMatches = async (userId) => {
  try {
    // Get books the user has
    const userBooks = await getBooksByUser(userId);
    
    // Get books the user wants
    const userWantedBooks = await getWantedBooksByUser(userId);
    
    // Get all books from other users
    const booksRef = collection(db, COLLECTIONS.BOOKS);
    const q = query(booksRef, where("owner.id", "!=", userId));
    const otherUsersBooks = await getDocs(q);
    
    // Get all wanted books from other users
    const wantedBooksRef = collection(db, COLLECTIONS.WANTED_BOOKS);
    const wq = query(wantedBooksRef, where("user_id", "!=", userId));
    const otherUsersWantedBooks = await getDocs(wq);
    
    // Find matches where:
    // 1. Other users have books that the current user wants
    // 2. Other users want books that the current user has
    
    const matches = [];
    
    // Check for books other users have that the current user wants
    for (const wantedBook of userWantedBooks) {
      otherUsersBooks.forEach(doc => {
        const book = { id: doc.id, ...doc.data() };
        
        // Simple matching by title and author
        if (book.title.toLowerCase() === wantedBook.title.toLowerCase() && 
            book.author.toLowerCase() === wantedBook.author.toLowerCase()) {
          matches.push({
            type: 'they_have_what_i_want',
            book: book,
            wantedBook: wantedBook,
            userId: userId,
            otherUserId: book.owner.id,
            score: 10 // Perfect match
          });
        }
      });
    }
    
    // Check for books the current user has that other users want
    for (const userBook of userBooks) {
      otherUsersWantedBooks.forEach(doc => {
        const wantedBook = { id: doc.id, ...doc.data() };
        
        // Simple matching by title and author
        if (userBook.title.toLowerCase() === wantedBook.title.toLowerCase() && 
            userBook.author.toLowerCase() === wantedBook.author.toLowerCase()) {
          matches.push({
            type: 'i_have_what_they_want',
            book: userBook,
            wantedBook: wantedBook,
            userId: userId,
            otherUserId: wantedBook.user_id,
            score: 10 // Perfect match
          });
        }
      });
    }
    
    return matches;
  } catch (error) {
    console.error("Error finding matches:", error);
    throw error;
  }
};

// Authentication functions
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await userCredential.user.updateProfile({
        displayName: displayName
      });
    }
    return userCredential.user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// File upload function
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Chat functions
export const getChats = async (userId) => {
  try {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(
      chatsRef, 
      where("participants", "array-contains", userId),
      orderBy("updated_at", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting chats:", error);
    throw error;
  }
};

export const getMessages = async (chatId) => {
  try {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
      messagesRef,
      where("chat_id", "==", chatId),
      orderBy("created_at", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
};

export const sendMessage = async (chatId, content, senderId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const messageData = {
      chat_id: chatId,
      content: content,
      sender_id: senderId || user.uid,
      sender_name: user.displayName || "Anonymous",
      created_at: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), messageData);
    
    // Update the chat's updated_at timestamp
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      updated_at: serverTimestamp(),
      last_message: content
    });
    
    return { id: docRef.id, ...messageData };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};
