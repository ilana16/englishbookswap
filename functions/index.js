const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const cors = require("cors")({ 
  origin: true, // Allow requests from any origin
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});
const os = require("os");
const fs = require("fs");
const path = require("path");
// Initialize Firebase Admin SDK
admin.initializeApp();
const storage = admin.storage();

// Profile picture upload function
exports.uploadProfilePicture = functions.https.onRequest(async (req, res) => {
  // Set CORS headers for preflight requests
  res.set('Access-Control-Allow-Origin', 'https://englishbookswap.com');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  // Handle the actual request
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }
    // Enforce authentication
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).send("Unauthorized: No token provided.");
    }
    
    let userId;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      userId = decodedToken.uid; // Get userId from the verified token
    } catch (error) {
      console.error("Error verifying Firebase ID token:", error);
      return res.status(401).send("Unauthorized: Invalid token.");
    }
    const busboy = Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    let uploadData = null;
    let newFilePath = null;
    busboy.on("file", (fieldname, file, MimeType) => {
      const { filename, encoding, mimeType } = MimeType;
      console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
      
      // Use the authenticated userId from the token
      const fileExt = filename.split(".").pop();
      const randomFileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filepath = path.join(tmpdir, randomFileName);
      newFilePath = `profile-pictures/${userId}/avatar.${fileExt}`; // Consistent naming
      uploadData = { file: filepath, type: mimeType, storagePath: newFilePath };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", async () => {
      if (!uploadData) {
        return res.status(400).send("No file uploaded.");
      }
      const bucket = storage.bucket(); // Default bucket
      try {
        const [uploadedFile] = await bucket.upload(uploadData.file, {
          destination: uploadData.storagePath,
          metadata: {
            contentType: uploadData.type,
            cacheControl: "public, max-age=31536000", // Cache for 1 year
          },
        });
        // Get a signed URL (more secure, expires)
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
        const [signedUrl] = await uploadedFile.getSignedUrl({
          action: "read",
          expires: expires.toISOString(),
        });
        fs.unlinkSync(uploadData.file); // Clean up temporary file
        return res.status(200).json({ imageUrl: signedUrl });
      } catch (err) {
        console.error("Error uploading to Firebase Storage:", err);
        if (uploadData && uploadData.file) {
          fs.unlinkSync(uploadData.file); // Clean up temporary file on error
        }
        return res.status(500).send(`Error uploading file: ${err.message}`);
      }
    });
    busboy.end(req.rawBody);
  });
});

// Helper function to send email
const sendEmail = async (email, subject, text) => {
  try {
    const mailOptions = {
      from: 'English Book Swap <noreply@englishbookswap.com>',
      to: email,
      subject: subject,
      text: text + '\n\nVisit our homepage: https://englishbookswap.com'
    };

    await admin.firestore().collection('mail').add(mailOptions);
    console.log(`Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// 1. New Match Notification
exports.sendMatchNotification = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snapshot, context) => {
    try {
      const matchData = snapshot.data();
      const { user1Id, user2Id, bookId1, bookId2 } = matchData;
      
      // Get user information
      const user1Doc = await admin.firestore().collection('profiles').doc(user1Id).get();
      const user2Doc = await admin.firestore().collection('profiles').doc(user2Id).get();
      
      if (!user1Doc.exists || !user2Doc.exists) {
        console.error('One or both users not found');
        return null;
      }
      
      const user1 = user1Doc.data();
      const user2 = user2Doc.data();
      
      // Get user email from Firebase Auth
      const user1Auth = await admin.auth().getUser(user1Id);
      const user2Auth = await admin.auth().getUser(user2Id);
      
      const matchUrl = `https://englishbookswap.com/matches/${context.params.matchId}`;
      
      // Send email to user1
      await sendEmail(
        user1Auth.email,
        'New Book Match',
        `You have a new book match with ${user2.displayName || 'another user'}! Click the link below to view the match details:\n\n${matchUrl}`
      );
      
      // Send email to user2
      await sendEmail(
        user2Auth.email,
        'New Book Match',
        `You have a new book match with ${user1.displayName || 'another user'}! Click the link below to view the match details:\n\n${matchUrl}`
      );
      
      return null;
    } catch (error) {
      console.error('Error sending match notification:', error);
      return null;
    }
  });

// 2. Wanted Book Availability Notification
exports.sendWantedBookNotification = functions.firestore
  .document('books/{bookId}')
  .onCreate(async (snapshot, context) => {
    try {
      const bookData = snapshot.data();
      const { title, author, google_books_id, owner } = bookData;
      
      // Find users who want this book
      let wantedBooksQuery;
      
      if (google_books_id) {
        // If we have a Google Books ID, use that for matching
        wantedBooksQuery = admin.firestore()
          .collection('wanted_books')
          .where('google_books_id', '==', google_books_id);
      } else {
        // Otherwise, try to match by title and author
        wantedBooksQuery = admin.firestore()
          .collection('wanted_books')
          .where('title', '==', title)
          .where('author', '==', author);
      }
      
      const wantedBooksSnapshot = await wantedBooksQuery.get();
      
      if (wantedBooksSnapshot.empty) {
        console.log('No users want this book');
        return null;
      }
      
      // Get owner profile
      const ownerDoc = await admin.firestore().collection('profiles').doc(owner.id).get();
      const ownerData = ownerDoc.exists ? ownerDoc.data() : { displayName: 'A user' };
      
      // For each user who wants this book
      const emailPromises = wantedBooksSnapshot.docs.map(async (doc) => {
        const wantedBookData = doc.data();
        const userId = wantedBookData.user_id;
        
        // Don't notify the owner if they also want the book
        if (userId === owner.id) {
          return null;
        }
        
        try {
          // Get user email
          const userAuth = await admin.auth().getUser(userId);
          const userEmail = userAuth.email;
          
          // Create message link
          const messageUrl = `https://englishbookswap.com/chat/new?userId=${owner.id}&bookId=${context.params.bookId}`;
          
          // Send email notification
          await sendEmail(
            userEmail,
            'A Book You Want is Available',
            `Good news! A book you want is now available:\n\nTitle: ${title}\nAuthor: ${author}\n\nIt's available from ${ownerData.displayName || 'a user'} in ${owner.neighborhood}.\n\nClick here to message them about this book: ${messageUrl}`
          );
          
          return true;
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          return null;
        }
      });
      
      await Promise.all(emailPromises);
      return null;
    } catch (error) {
      console.error('Error sending wanted book notifications:', error);
      return null;
    }
  });

// 3. New Message Notification
exports.sendMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const messageData = snapshot.data();
      const { chat_id, sender_id, sender_name, content } = messageData;
      
      // Get chat to find recipient
      const chatDoc = await admin.firestore().collection('chats').doc(chat_id).get();
      
      if (!chatDoc.exists) {
        console.error('Chat not found');
        return null;
      }
      
      const chatData = chatDoc.data();
      const { participants } = chatData;
      
      // Find recipient (the participant who is not the sender)
      const recipientId = participants.find(id => id !== sender_id);
      
      if (!recipientId) {
        console.error('Recipient not found in chat participants');
        return null;
      }
      
      // Get recipient email
      const recipientAuth = await admin.auth().getUser(recipientId);
      const recipientEmail = recipientAuth.email;
      
      // Create chat URL
      const chatUrl = `https://englishbookswap.com/chat/${chat_id}`;
      
      // Send email notification
      await sendEmail(
        recipientEmail,
        'New Book Message',
        `You got a message from ${sender_name || 'another user'}: ${content}\n\nClick here to view the conversation: ${chatUrl}`
      );
      
      return null;
    } catch (error) {
      console.error('Error sending message notification:', error);
      return null;
    }
  });
