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
// Remove direct storage imports if no longer used directly by client for uploads
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { db, auth, storage } from "./config"; // storage might still be used for other things
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
        // neighborhood: bookData.neighborhood || "Unknown" // This was part of previous changes, ensure it aligns
        neighborhood: user.profile?.defaultNeighborhood || bookData.neighborhood || "Unknown" // Assuming profile is loaded with user
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
      // neighborhood: user.profile?.defaultNeighborhood || bookData.neighborhood || "Unknown", // Ensure alignment
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
    const userBooks = await getBooksByUser(userId);
    const userWantedBooks = await getWantedBooksByUser(userId);
    
    const booksRef = collection(db, COLLECTIONS.BOOKS);
    const qOtherBooks = query(booksRef, where("owner.id", "!=", userId));
    const otherUsersBooksSnapshot = await getDocs(qOtherBooks);
    const otherUsersBooks = otherUsersBooksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const wantedBooksRef = collection(db, COLLECTIONS.WANTED_BOOKS);
    const qOtherWanted = query(wantedBooksRef, where("user_id", "!=", userId));
    const otherUsersWantedBooksSnapshot = await getDocs(qOtherWanted);
    const otherUsersWantedBooks = otherUsersWantedBooksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const matches = [];
    
    for (const wantedBook of userWantedBooks) {
      for (const book of otherUsersBooks) {
        if (book.title.toLowerCase() === wantedBook.title.toLowerCase() && 
            book.author.toLowerCase() === wantedBook.author.toLowerCase() &&
            (wantedBook.condition === "any" || book.condition === wantedBook.condition)) {
          matches.push({
            type: 'they_have_what_i_want',
            book: book,
            wantedBook: wantedBook,
            userId: userId,
            otherUserId: book.owner.id,
            score: 10 
          });
        }
      }
    }
    
    for (const userBook of userBooks) {
      for (const wantedBook of otherUsersWantedBooks) {
        if (userBook.title.toLowerCase() === wantedBook.title.toLowerCase() && 
            userBook.author.toLowerCase() === wantedBook.author.toLowerCase() &&
            (wantedBook.condition === "any" || userBook.condition === wantedBook.condition)) {
          matches.push({
            type: 'i_have_what_they_want',
            book: userBook,
            wantedBook: wantedBook,
            userId: userId,
            otherUserId: wantedBook.user_id,
            score: 10
          });
        }
      }
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
    if (displayName && userCredential.user) {
      // This is where you might update the profile in Firestore as well
      // For now, just updating Firebase Auth profile
      await userCredential.user.updateProfile({ displayName });
      // Consider creating a profile document in Firestore here
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
    // Consider creating/updating a profile document in Firestore here
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

// OLD File upload function - to be replaced or kept for other uses if any
// export const uploadFile = async (file, path) => {
//   try {
//     const storageRef = ref(storage, path);
//     const snapshot = await uploadBytes(storageRef, file);
//     const downloadURL = await getDownloadURL(snapshot.ref);
//     return downloadURL;
//   } catch (error) {
//     console.error("Error uploading file:", error);
//     throw error;
//   }
// };

// NEW function to upload profile picture via Cloud Function
export const uploadProfilePictureViaFunction = async (file: File, userId: string): Promise<string> => {
  const formData = new FormData();
  formData.append("profileImage", file); // The Cloud Function expects the fieldname used in busboy.on("file", (fieldname...))

  // Replace with your actual Cloud Function URL and region if different
  const functionUrl = `https://us-central1-books-794a8.cloudfunctions.net/uploadProfilePicture?userId=${userId}`;

  try {
    const user = getCurrentUser();
    let token = null;
    if (user) {
      token = await user.getIdToken();
    }

    const response = await fetch(functionUrl, {
      method: "POST",
      body: formData,
      headers: {
        // Include Authorization header if your Cloud Function verifies it
        ...(token && { "Authorization": `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error response from Cloud Function:", errorData);
      throw new Error(`Error uploading image: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.imageUrl) {
      console.error("Cloud Function did not return imageUrl:", result);
      throw new Error("Failed to get image URL from upload function.");
    }
    return result.imageUrl;
  } catch (error) {
    console.error("Error calling uploadProfilePicture Cloud Function:", error);
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

// Function to get user profile
export const getProfile = async (userId: string) => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      return { id: profileSnap.id, ...profileSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

// Function to update user profile
export const updateProfile = async (userId: string, profileData: any) => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    await updateDoc(profileRef, {
      ...profileData,
      updated_at: serverTimestamp(),
    });

    // If defaultNeighborhood changed, update all user's books
    if (profileData.defaultNeighborhood) {
      const booksSnapshot = await getDocs(query(collection(db, COLLECTIONS.BOOKS), where("owner.id", "==", userId)));
      const wantedBooksSnapshot = await getDocs(query(collection(db, COLLECTIONS.WANTED_BOOKS), where("user_id", "==", userId)));

      const batch = []; // Firestore batch write is not available in client SDK, do individual updates
      booksSnapshot.forEach(bookDoc => {
        batch.push(updateDoc(doc(db, COLLECTIONS.BOOKS, bookDoc.id), { "owner.neighborhood": profileData.defaultNeighborhood, updated_at: serverTimestamp() }));
      });
      wantedBooksSnapshot.forEach(bookDoc => {
        batch.push(updateDoc(doc(db, COLLECTIONS.WANTED_BOOKS, bookDoc.id), { neighborhood: profileData.defaultNeighborhood, updated_at: serverTimestamp() }));
      });
      await Promise.all(batch);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

