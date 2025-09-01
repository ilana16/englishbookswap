// Enhanced email service with retry logic, timeout handling, and immediate delivery
const EMAIL_SERVICE_URL = 'https://w5hni7cponmo.manus.space/api/email';

interface EmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface EmailOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Enhanced email service call with retry logic and timeout handling
 */
const callEmailServiceWithRetry = async (
  endpoint: string, 
  email: string, 
  options: EmailOptions = {}
): Promise<boolean> => {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📧 Attempt ${attempt}/${retries}: Sending email to ${email} via ${endpoint}`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${EMAIL_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EmailResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Email sent successfully on attempt ${attempt}: ${data.message}`);
        return true;
      } else {
        console.warn(`⚠️ Email service returned failure on attempt ${attempt}: ${data.error || data.message}`);
        if (attempt === retries) {
          console.error(`❌ All ${retries} attempts failed for ${email}`);
          return false;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        console.error(`❌ All ${retries} attempts failed for ${email}:`, error);
        return false;
      }
      
      // Wait before retry (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
};

/**
 * Immediate notification functions with enhanced reliability
 */
export const notifyNewMatchImmediate = async (recipientEmail: string): Promise<boolean> => {
  console.log(`🚀 IMMEDIATE: Sending new match notification to: ${recipientEmail}`);
  return await callEmailServiceWithRetry('/send-new-match', recipientEmail, {
    timeout: 8000,
    retries: 3,
    retryDelay: 500
  });
};

export const notifyBookAvailabilityImmediate = async (recipientEmail: string): Promise<boolean> => {
  console.log(`🚀 IMMEDIATE: Sending book availability notification to: ${recipientEmail}`);
  return await callEmailServiceWithRetry('/send-book-available', recipientEmail, {
    timeout: 8000,
    retries: 3,
    retryDelay: 500
  });
};

export const notifyNewMessageImmediate = async (recipientEmail: string): Promise<boolean> => {
  console.log(`🚀 IMMEDIATE: Sending new message notification to: ${recipientEmail}`);
  return await callEmailServiceWithRetry('/send-new-message', recipientEmail, {
    timeout: 8000,
    retries: 3,
    retryDelay: 500
  });
};

/**
 * Batch notification function for multiple recipients
 */
export const sendBatchNotifications = async (
  notificationType: 'new_matches' | 'book_availability' | 'new_messages',
  recipients: string[]
): Promise<{ success: string[], failed: string[] }> => {
  console.log(`📬 Sending batch ${notificationType} notifications to ${recipients.length} recipients`);
  
  const results = await Promise.allSettled(
    recipients.map(async (email) => {
      switch (notificationType) {
        case 'new_matches':
          return { email, success: await notifyNewMatchImmediate(email) };
        case 'book_availability':
          return { email, success: await notifyBookAvailabilityImmediate(email) };
        case 'new_messages':
          return { email, success: await notifyNewMessageImmediate(email) };
        default:
          return { email, success: false };
      }
    })
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      success.push(recipients[index]);
    } else {
      failed.push(recipients[index]);
    }
  });

  console.log(`📊 Batch notification results: ${success.length} successful, ${failed.length} failed`);
  return { success, failed };
};

/**
 * Test email service connectivity
 */
export const testEmailServiceConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing email service connectivity...');
    const response = await fetch(`${EMAIL_SERVICE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Email service is healthy and responsive');
      return true;
    } else {
      console.warn('⚠️ Email service responded but not healthy');
      return false;
    }
  } catch (error) {
    console.error('❌ Email service connectivity test failed:', error);
    return false;
  }
};

