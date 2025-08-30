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
    // Check if email is valid
    if (!email || !email.includes('@')) {
      console.error('Invalid email address:', email);
      return false;
    }

    const mailOptions = {
      to: [email], // Firebase Mail extension expects array
      message: {
        subject: subject,
        text: message,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #436B95;">English Book Swap Jerusalem</h2>
          <p style="font-size: 16px; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated notification from English Book Swap Jerusalem. 
            <br>Happy reading!
          </p>
        </div>`
      },
      delivery: {
        startTime: admin.firestore.Timestamp.now()
      }
    };

    const docRef = await admin.firestore().collection('mail').add(mailOptions);
    console.log(`Email queued successfully for ${email}: ${subject} (Doc ID: ${docRef.id})`);
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
      const { owner_id, requester_id, book_id } = requestData;
      
      console.log(`New swap request created: ${context.params.requestId}`);
      console.log(`Owner: ${owner_id}, Requester: ${requester_id}, Book: ${book_id}`);
      
      if (!owner_id) {
        console.error('No owner_id found in swap request');
        return null;
      }
      
      // Get owner's email from Firebase Auth
      try {
        const ownerAuth = await admin.auth().getUser(owner_id);
        if (ownerAuth.email) {
          const success = await sendEmail(
            ownerAuth.email,
            'New Book Match - English Book Swap Jerusalem',
            'You have a new book match.'
          );
          
          if (success) {
            console.log(`New match notification sent successfully to ${ownerAuth.email}`);
          } else {
            console.error(`Failed to send new match notification to ${ownerAuth.email}`);
          }
        } else {
          console.error(`No email found for user ${owner_id}`);
        }
      } catch (authError) {
        console.error(`Error getting user ${owner_id} from Firebase Auth:`, authError);
      }
      
      return null;
    } catch (error) {
      console.error('Error in sendNewMatchNotification:', error);
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
      const bookId = context.params.bookId;
      
      console.log(`New book added: ${title} by ${author} (ID: ${bookId})`);
      
      if (!title || !author) {
        console.error('Book missing title or author');
        return null;
      }
      
      // Find users who want this book (matching title and author)
      const wantedBooksSnapshot = await admin.firestore()
        .collection('wanted_books')
        .where('title', '==', title)
        .where('author', '==', author)
        .get();
      
      console.log(`Found ${wantedBooksSnapshot.size} users wanting this book`);
      
      if (wantedBooksSnapshot.empty) {
        console.log('No users want this book');
        return null;
      }
      
      // Send notification to each user who wants this book
      const emailPromises = wantedBooksSnapshot.docs.map(async (doc) => {
        const wantedBookData = doc.data();
        const userId = wantedBookData.user_id;
        
        // Don't notify the owner if they also want the book
        if (userId === (owner?.id || owner)) {
          console.log(`Skipping notification to owner ${userId}`);
          return null;
        }
        
        try {
          const userAuth = await admin.auth().getUser(userId);
          if (userAuth.email) {
            const success = await sendEmail(
              userAuth.email,
              'Book Available - English Book Swap Jerusalem',
              'A book you want is available.'
            );
            
            if (success) {
              console.log(`Book availability notification sent to ${userAuth.email}`);
            } else {
              console.error(`Failed to send notification to ${userAuth.email}`);
            }
            return success;
          } else {
            console.error(`No email found for user ${userId}`);
            return null;
          }
        } catch (authError) {
          console.error(`Error getting user ${userId} from Firebase Auth:`, authError);
          return null;
        }
      });
      
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(result => result === true).length;
      console.log(`Book availability notifications: ${successCount} sent successfully`);
      
      return null;
    } catch (error) {
      console.error('Error in sendBookAvailabilityNotification:', error);
      return null;
    }
  });

// 3. New message notification - triggered when messages are created
exports.sendNewMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const messageData = snapshot.data();
      const { chat_id, sender_id, content } = messageData;
      const messageId = context.params.messageId;
      
      console.log(`New message created: ${messageId} in chat ${chat_id} from ${sender_id}`);
      
      if (!chat_id || !sender_id) {
        console.error('Message missing chat_id or sender_id');
        return null;
      }
      
      // Get chat to find recipient
      const chatDoc = await admin.firestore().collection('chats').doc(chat_id).get();
      
      if (!chatDoc.exists) {
        console.error(`Chat ${chat_id} not found`);
        return null;
      }
      
      const chatData = chatDoc.data();
      const { participants } = chatData;
      
      if (!participants || !Array.isArray(participants)) {
        console.error(`Invalid participants in chat ${chat_id}:`, participants);
        return null;
      }
      
      // Find recipient (the participant who is not the sender)
      const recipientId = participants.find(id => id !== sender_id);
      
      if (!recipientId) {
        console.error(`Recipient not found in chat participants: ${participants}`);
        return null;
      }
      
      console.log(`Sending message notification to recipient: ${recipientId}`);
      
      // Get recipient's email and send notification
      try {
        const recipientAuth = await admin.auth().getUser(recipientId);
        if (recipientAuth.email) {
          const success = await sendEmail(
            recipientAuth.email,
            'New Message - English Book Swap Jerusalem',
            'You have a new book swap message.'
          );
          
          if (success) {
            console.log(`New message notification sent successfully to ${recipientAuth.email}`);
          } else {
            console.error(`Failed to send message notification to ${recipientAuth.email}`);
          }
        } else {
          console.error(`No email found for recipient ${recipientId}`);
        }
      } catch (authError) {
        console.error(`Error getting recipient ${recipientId} from Firebase Auth:`, authError);
      }
      
      return null;
    } catch (error) {
      console.error('Error in sendNewMessageNotification:', error);
      return null;
    }
  });

// Test email function for debugging
exports.testEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { email, testType } = data;
    
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    
    let subject, message;
    
    switch (testType) {
      case 'match':
        subject = 'New Book Match - English Book Swap Jerusalem';
        message = 'You have a new book match.';
        break;
      case 'availability':
        subject = 'Book Available - English Book Swap Jerusalem';
        message = 'A book you want is available.';
        break;
      case 'message':
        subject = 'New Message - English Book Swap Jerusalem';
        message = 'You have a new book swap message.';
        break;
      default:
        subject = 'Test Email - English Book Swap Jerusalem';
        message = 'This is a test email from English Book Swap Jerusalem.';
    }
    
    const success = await sendEmail(email, subject, message);
    
    return {
      success: success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email'
    };
  } catch (error) {
    console.error('Error in testEmail function:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test email');
  }
});

