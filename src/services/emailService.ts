// Email service that calls the deployed Flask email service
const EMAIL_SERVICE_URL = 'https://w5hni7cponmo.manus.space/api/email';

interface EmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface EmailNotificationData {
  email: string;
  subject: string;
  message: string;
}

const callEmailService = async (endpoint: string, data: EmailNotificationData): Promise<boolean> => {
  try {
    const response = await fetch(`${EMAIL_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData: EmailResponse = await response.json();
    
    if (responseData.success) {
      console.log(`Email notification sent successfully: ${responseData.message}`);
      return true;
    } else {
      console.error(`Failed to send email notification: ${responseData.error || responseData.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error calling email service:', error);
    return false;
  }
};

export const notifyNewMatch = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending new match notification to: ${recipientEmail}`);
  const emailData: EmailNotificationData = {
    email: recipientEmail,
    subject: "You have a new match - English Book Swap",
    message: "You have a new match."
  };
  return await callEmailService('/send-notification', emailData);
};

export const notifyBookAvailability = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending book availability notification to: ${recipientEmail}`);
  const emailData: EmailNotificationData = {
    email: recipientEmail,
    subject: "A book you want is available - English Book Swap",
    message: "A book you want is available."
  };
  return await callEmailService('/send-notification', emailData);
};

export const notifyNewMessage = async (recipientEmail: string): Promise<boolean> => {
  console.log(`Sending new message notification to: ${recipientEmail}`);
  const emailData: EmailNotificationData = {
    email: recipientEmail,
    subject: "You have a new book swap message - English Book Swap",
    message: "You have a new book swap message."
  };
  return await callEmailService('/send-notification', emailData);
};

export const testEmail = async (recipientEmail: string, testType: string = 'test'): Promise<boolean> => {
  try {
    const response = await fetch(`${EMAIL_SERVICE_URL}/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: recipientEmail, testType }),
    });

    const data: EmailResponse = await response.json();
    
    if (data.success) {
      console.log(`Test email sent successfully: ${data.message}`);
      return true;
    } else {
      console.error(`Failed to send test email: ${data.error || data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
};

