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

// Helper function to send email
const sendEmail = async (email, subject, message) => {
  try {
    const mailOptions = {
      to: email,
      message: {
        subject: subject,
        text: message,
        html: `<p>${message}</p>`
      }
    };

    await admin.firestore().collection('mail').add(mailOptions);
    console.log(`Email sent to ${email}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

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

// 1. New match notification - triggered when swap_requests are created
exports.sendNewMatchNotification = functions.firestore
  .document('swap_requests/{requestId}')
  .onCreate(async (snapshot, context) => {
    try {
      const requestData = snapshot.data();
      const { owner_id } = requestData;
      
      // Get owner's email
      const ownerAuth = await admin.auth().getUser(owner_id);
      if (ownerAuth.email) {
        await sendEmail(
          ownerAuth.email,
          'New Book Match',
          'You have a new book match.'
        );
      }
      
      return null;
    } catch (error) {
      console.error('Error sending new match notification:', error);
      return null;
    }
  });

// 2. Book availability notification - triggered when books are created
exports.sendBookAvailabilityNotification = functions.firestore
  .document('books/{bookId}')
  .onCreate(async (snapshot, context) => {
    try {
      const bookData = snapshot.data();
      const { title, author, owner } = bookData;
      
      // Find users who want this book
      const wantedBooksSnapshot = await admin.firestore()
        .collection('wanted_books')
        .where('title', '==', title)
        .where('author', '==', author)
        .get();
      
      // Send notification to each user who wants this book
      const emailPromises = wantedBooksSnapshot.docs.map(async (doc) => {
        const wantedBookData = doc.data();
        const userId = wantedBookData.user_id;
        
        // Don't notify the owner if they also want the book
        if (userId === owner.id) {
          return null;
        }
        
        try {
          const userAuth = await admin.auth().getUser(userId);
          if (userAuth.email) {
            await sendEmail(
              userAuth.email,
              'Book Available',
              'A book you want is available.'
            );
          }
          return true;
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          return null;
        }
      });
      
      await Promise.all(emailPromises);
      return null;
    } catch (error) {
      console.error('Error sending book availability notifications:', error);
      return null;
    }
  });

// 3. New message notification - triggered when messages are created
exports.sendNewMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const messageData = snapshot.data();
      const { chat_id, sender_id } = messageData;
      
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
      
      // Get recipient's email and send notification
      const recipientAuth = await admin.auth().getUser(recipientId);
      if (recipientAuth.email) {
        await sendEmail(
          recipientAuth.email,
          'New Message',
          'You have a new book swap message.'
        );
      }
      
      return null;
    } catch (error) {
      console.error('Error sending new message notification:', error);
      return null;
    }
  });
