const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const cors = require("cors")({ origin: ["https://englishbookswap.com"] }); // Restrict to your domain
const os = require("os");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin SDK
admin.initializeApp();

const storage = admin.storage();

exports.uploadProfilePicture = functions.https.onRequest(async (req, res) => {
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
