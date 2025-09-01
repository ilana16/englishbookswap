// Email service that calls the deployed Flask email service
const EMAIL_SERVICE_URL = 'https://w5hni7cponmo.manus.space/api/email';

interface EmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

const callEmailService = async (endpoint: string, email: string): Promise<boolean> => {
  try {
    const response = await fetch(`${EMAIL_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data: EmailResponse = await response.json();
    
    if (data.success) {
      console.log(`Email notification sent successfully: ${data.message}`);
      return true;
    } else {
      console.error(`Failed to send email notification: ${data.error || data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error calling email service:', error);
    return false;
  }
};

export const notifyNewMatch = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending new match notification to: ${recipientEmail}`);
  return await callEmailService('/send-new-match', recipientEmail);
};

export const notifyBookAvailability = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending book availability notification to: ${recipientEmail}`);
  return await callEmailService('/send-book-available', recipientEmail);
};

export const notifyNewMessage = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending new message notification to: ${recipientEmail}`);
  return await callEmailService('/send-new-message', recipientEmail);
};

