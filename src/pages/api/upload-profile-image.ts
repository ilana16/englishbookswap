import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

// Ensure global.FormData and global.Blob are available or use a polyfill if in an older Node environment
// In Next.js API routes, these should generally be available with modern Node versions.

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser, formidable will handle it
  },
};

const CLOUD_FUNCTION_URL = "https://us-central1-books-794a8.cloudfunctions.net/uploadProfilePicture";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const form = formidable({}); // Use default options

  try {
    const [fields, files] = await form.parse(req);

    const imageFileArray = files.profileImage;
    if (!imageFileArray || imageFileArray.length === 0) {
      return res.status(400).json({ message: "No image file uploaded (field name should be 'profileImage')." });
    }
    const imageFile = imageFileArray[0];

    const clientAuthHeader = req.headers.authorization;
    if (!clientAuthHeader) {
      return res.status(401).json({ message: "Authorization header is missing." });
    }

    const userId = req.query.userId as string;
    if (!userId) {
        return res.status(400).json({ message: "userId query parameter is missing." });
    }

    const targetUrl = `${CLOUD_FUNCTION_URL}?userId=${userId}`;

    // Read the file content from the temporary path provided by formidable
    const fileContent = await fs.promises.readFile(imageFile.filepath);
    const blob = new Blob([fileContent], { type: imageFile.mimetype || "application/octet-stream" });

    // Create a new FormData to send to the Cloud Function using global FormData
    const formDataForFetch = new FormData(); 
    formDataForFetch.append("profileImage", blob, imageFile.originalFilename || "upload");

    const response = await fetch(targetUrl, {
      method: "POST",
      body: formDataForFetch,
      headers: {
        // Content-Type for multipart/form-data is set automatically by fetch when using FormData
        "Authorization": clientAuthHeader,
      },
    });

    // Try to parse JSON, but handle cases where it might not be JSON (e.g. plain text error)
    let responseData;
    const responseContentType = response.headers.get("content-type");
    if (responseContentType && responseContentType.includes("application/json")) {
        responseData = await response.json();
    } else {
        responseData = { message: await response.text() };
    }

    if (!response.ok) {
      console.error(`Error from Cloud Function (${response.status}):`, responseData.message || response.statusText);
      return res.status(response.status).json({
        message: `Error from Cloud Function: ${responseData.message || response.statusText}`,
        details: responseData
      });
    }

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error("Error in proxy API route:", error);
    if (error.httpCode) { // Error from formidable (e.g. file size limit)
        return res.status(error.httpCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error processing the upload.", error: error.message });
  } finally {
    // Clean up formidable's temporary files if any were not automatically cleaned
    // formidable usually handles this, but good to be aware.
    // Example: if (imageFile && imageFile.filepath) { fs.unlink(imageFile.filepath, () => {}); }
  }
}

