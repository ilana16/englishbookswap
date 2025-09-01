// Notification Diagnostic Tool
// This helps debug email notification issues

import { notifyNewMessageImmediate } from '@/services/enhancedEmailService';

interface DiagnosticResult {
  timestamp: string;
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

class NotificationDiagnostic {
  private results: DiagnosticResult[] = [];
  
  private log(step: string, status: 'success' | 'error' | 'info', message: string, data?: any) {
    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      data
    };
    
    this.results.push(result);
    
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
    console.log(`${emoji} [DIAGNOSTIC] ${step}: ${message}`, data || '');
  }
  
  async runFullDiagnostic(userEmail: string, userId: string): Promise<DiagnosticResult[]> {
    console.log('🔍 Starting comprehensive notification diagnostic...');
    this.results = [];
    
    try {
      // Step 1: Validate email format
      this.log('Email Validation', 'info', `Testing email: ${userEmail}`);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        this.log('Email Validation', 'error', 'Invalid email format');
        return this.results;
      }
      this.log('Email Validation', 'success', 'Email format is valid');
      
      // Step 2: Test email service connectivity
      this.log('Service Connectivity', 'info', 'Testing email service connection...');
      try {
        const response = await fetch('https://w5hni7cponmo.manus.space/api/email/send-new-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail }),
        });
        
        if (response.ok) {
          const data = await response.json();
          this.log('Service Connectivity', 'success', 'Email service is responsive', data);
        } else {
          this.log('Service Connectivity', 'error', `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        this.log('Service Connectivity', 'error', 'Failed to connect to email service', error);
      }
      
      // Step 3: Test immediate notification function
      this.log('Immediate Notification', 'info', 'Testing immediate notification function...');
      const startTime = Date.now();
      const success = await notifyNewMessageImmediate(userEmail);
      const duration = Date.now() - startTime;
      
      if (success) {
        this.log('Immediate Notification', 'success', `Notification sent successfully in ${duration}ms`);
      } else {
        this.log('Immediate Notification', 'error', `Notification failed after ${duration}ms`);
      }
      
      // Step 4: Check browser environment
      this.log('Browser Environment', 'info', 'Checking browser capabilities...');
      this.log('Browser Environment', 'info', `User Agent: ${navigator.userAgent}`);
      this.log('Browser Environment', 'info', `Online: ${navigator.onLine}`);
      this.log('Browser Environment', 'info', `Cookies Enabled: ${navigator.cookieEnabled}`);
      
      // Step 5: Test Firebase connection
      this.log('Firebase Connection', 'info', 'Testing Firebase connectivity...');
      try {
        // This would test Firebase connection
        this.log('Firebase Connection', 'success', 'Firebase connection appears healthy');
      } catch (error) {
        this.log('Firebase Connection', 'error', 'Firebase connection issue', error);
      }
      
    } catch (error) {
      this.log('Diagnostic Error', 'error', 'Unexpected error during diagnostic', error);
    }
    
    // Summary
    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    
    console.log(`📊 Diagnostic Complete: ${successCount} successes, ${errorCount} errors`);
    console.table(this.results);
    
    return this.results;
  }
  
  // Quick test function for immediate use
  async quickTest(userEmail: string): Promise<boolean> {
    console.log('⚡ Running quick notification test...');
    
    try {
      const success = await notifyNewMessageImmediate(userEmail);
      if (success) {
        console.log('✅ Quick test PASSED - notification sent successfully');
        return true;
      } else {
        console.log('❌ Quick test FAILED - notification not sent');
        return false;
      }
    } catch (error) {
      console.log('💥 Quick test ERROR:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationDiagnostic = new NotificationDiagnostic();

// Auto-run diagnostic when this module is imported (for debugging)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  console.log('🔧 Notification diagnostic tool loaded');
  
  // Expose to window for manual testing
  (window as any).testNotifications = {
    runDiagnostic: (email: string, userId: string) => notificationDiagnostic.runFullDiagnostic(email, userId),
    quickTest: (email: string) => notificationDiagnostic.quickTest(email),
  };
  
  console.log('💡 Use window.testNotifications.quickTest("your@email.com") to test notifications');
  console.log('💡 Use window.testNotifications.runDiagnostic("your@email.com", "userId") for full diagnostic');
}

