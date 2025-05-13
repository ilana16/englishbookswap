// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app"s Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAizi-kY4VH5VfqbYyrg9FwLt5TGbrX_RI",
  authDomain: "books-794a8.firebaseapp.com",
  projectId: "books-794a8",
  storageBucket: "books-794a8.appspot.com", // Corrected value
  messagingSenderId: "28303860806",
  appId: "1:28303860806:web:df2ddcd86f08c7a4145647",
  measurementId: "G-LBNGSGFXGR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Set persistence to local to improve authentication reliability
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// Remove analytics for browser compatibility in development
// const analytics = getAnalytics(app);

export { app, db, auth, storage };

