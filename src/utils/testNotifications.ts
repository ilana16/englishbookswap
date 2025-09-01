import { testEmail } from '@/services/emailService';

/**
 * Test notification functionality
 */
export const testNotificationSystem = async (): Promise<void> => {
  console.log('🧪 Testing notification system...');
  
  try {
    const testEmailAddress = 'ilana.cunningham16@gmail.com';
    
    console.log(`📧 Sending test email to ${testEmailAddress}...`);
    const success = await testEmail(testEmailAddress, 'system-test');
    
    if (success) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.error('❌ Test email failed!');
    }
  } catch (error) {
    console.error('🚨 Error testing notification system:', error);
  }
};

// Auto-run test when this module is imported (for debugging)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    console.log('🔧 Auto-testing notification system...');
    testNotificationSystem();
  }, 2000);
}

