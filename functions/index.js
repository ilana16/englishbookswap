const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const cors = require("cors")({ origin: true });
const os = require("os");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin SDK
admin.initializeApp();

const storage = admin.storage();

exports.uploadProfilePicture = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Check for authentication (optional but recommended)
    // This example assumes the client sends an auth token in headers
    // and you verify it here. For simplicity, we'll skip detailed auth
    // token verification, but in a real app, you MUST secure this.
    // const idToken = req.headers.authorization?.split("Bearer ")[1];
    // if (!idToken) {
    //   return res.status(401).send("Unauthorized: No token provided.");
    // }
    // try {
    //   const decodedToken = await admin.auth().verifyIdToken(idToken);
    //   req.user = decodedToken; // Attach user to request
    // } catch (error) {
    //   console.error("Error verifying Firebase ID token:", error);
    //   return res.status(401).send("Unauthorized: Invalid token.");
    // }

    const busboy = Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();

    let uploadData = null;
    let newFilePath = null;

    busboy.on("file", (fieldname, file, MimeType) => {
      const { filename, encoding, mimeType } = MimeType;
      console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
      
      // Extract user ID from the request, e.g., from query param or authenticated user
      // For this example, let's assume it's passed as a query parameter `userId`
      // In a real app, use the authenticated req.user.uid
      const userId = req.query.userId || "unknown_user"; 
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
            // You can add more metadata here, like cache control
            // cacheControl: "public, max-age=31536000",
          },
        });

        // Make the file public (if desired, or generate signed URL)
        // await uploadedFile.makePublic(); 
        // const publicUrl = uploadedFile.publicUrl();

        // Or get a signed URL (more secure, expires)
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
        return res.status(500).send("Error uploading file.");
      }
    });

    busboy.end(req.rawBody);
  });
});

