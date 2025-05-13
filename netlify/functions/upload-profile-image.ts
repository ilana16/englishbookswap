import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import formidable from "formidable";
import fs from "fs";
import fetch, { FormData, Blob } from "node-fetch"; // Use node-fetch for FormData and Blob in Node.js environment

// Helper to parse multipart form data
async function parseMultipartForm(event: HandlerEvent): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({});
    // Netlify Functions pass the raw body as a string, potentially base64 encoded if isBase64Encoded is true.
    // Formidable needs a stream or a buffer. If base64 encoded, decode it first.
    const bodyBuffer = Buffer.from(event.body!, event.isBase64Encoded ? "base64" : "utf8");
    
    // formidable expects a request object to parse headers like Content-Type.
    // We need to simulate a request-like object or pass the buffer directly if possible.
    // For simplicity with formidable v3+, directly parsing from a buffer isn't straightforward.
    // An alternative is to use a library that can parse a buffer directly, or handle the raw parts.
    // However, Netlify often pre-parses or provides helpers. Let's assume for now we can make formidable work.
    // A common pattern is to pipe a readable stream. We can create one from the buffer.
    const { Readable } = require("stream");
    const readable = Readable.from(bodyBuffer);
    
    // We also need to pass headers to formidable, especially Content-Type
    const mockReq = readable as any; // Cast to any to add headers property
    mockReq.headers = event.headers;

    form.parse(mockReq, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}

const CLOUD_FUNCTION_URL = "https://us-central1-books-794a8.cloudfunctions.net/uploadProfilePicture";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Allow": "POST" },
    };
  }

  try {
    const { files } = await parseMultipartForm(event);

    const imageFileArray = files.profileImage;
    if (!imageFileArray || imageFileArray.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No image file uploaded (field name should be 'profileImage')." }),
      };
    }
    const imageFile = imageFileArray[0];

    const clientAuthHeader = event.headers.authorization;
    if (!clientAuthHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Authorization header is missing." }),
      };
    }

    const userId = event.queryStringParameters?.userId;
    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "userId query parameter is missing." }),
        };
    }

    const targetUrl = `${CLOUD_FUNCTION_URL}?userId=${userId}`;
    const fileContent = await fs.promises.readFile(imageFile.filepath);
    const blob = new Blob([fileContent], { type: imageFile.mimetype || "application/octet-stream" });

    const formDataForFetch = new FormData();
    formDataForFetch.append("profileImage", blob, imageFile.originalFilename || "upload.jpg");

    const response = await fetch(targetUrl, {
      method: "POST",
      body: formDataForFetch,
      headers: {
        "Authorization": clientAuthHeader,
        // Content-Type is set automatically by node-fetch when using FormData
      },
    });

    const responseDataText = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseDataText);
    } catch (e) {
        // If parsing fails, it means the response was not JSON (e.g. plain text error from GCF)
        responseData = { message: responseDataText }; // Use the raw text as a message
    }

    if (!response.ok) {
      console.error(`Error from Cloud Function (${response.status}):`, responseData.message || response.statusText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: `Error from Cloud Function: ${responseData.message || response.statusText}`,
          details: responseData
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
      headers: {
        "Content-Type": "application/json",
      },
    };

  } catch (error: any) {
    console.error("Error in Netlify function proxy:", error);
    let statusCode = 500;
    if (error.httpCode) { // Error from formidable (e.g. file size limit)
        statusCode = error.httpCode;
    }
    return {
      statusCode: statusCode,
      body: JSON.stringify({ message: "Internal Server Error processing the upload.", error: error.message }),
    };
  } finally {
    // formidable typically cleans up its own temp files
  }
};

export { handler };

