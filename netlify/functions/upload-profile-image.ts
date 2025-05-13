import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data"; // Import FormData from the form-data package

// Helper to parse multipart form data
async function parseMultipartForm(event: HandlerEvent): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({});
    const bodyBuffer = Buffer.from(event.body!, event.isBase64Encoded ? "base64" : "utf8");
    
    const { Readable } = require("stream");
    const readable = Readable.from(bodyBuffer);
    
    const mockReq = readable as any;
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
    
    // Use form-data to construct the multipart request
    const formData = new FormData();
    formData.append("profileImage", fs.createReadStream(imageFile.filepath), imageFile.originalFilename || "upload.jpg");

    const response = await fetch(targetUrl, {
      method: "POST",
      body: formData, // Pass the FormData object directly
      headers: {
        ...formData.getHeaders(), // Spread the headers from FormData (includes Content-Type with boundary)
        "Authorization": clientAuthHeader,
      },
    });

    const responseDataText = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseDataText);
    } catch (e) {
        responseData = { message: responseDataText };
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
    if (error.httpCode) {
        statusCode = error.httpCode;
    }
    return {
      statusCode: statusCode,
      body: JSON.stringify({ message: "Internal Server Error processing the upload.", error: error.message }),
    };
  }
};

export { handler };

