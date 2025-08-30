# Email Notification System Fix Guide

## Problem Identified
The email notification system was not working due to several issues:

1. **Firebase Functions not deployed** - The functions exist but haven't been deployed to Firebase
2. **Firebase Mail Extension not configured** - The mail collection approach requires the Firebase Mail extension
3. **Function logic issues** - Some functions had error handling and logic problems
4. **Missing authentication** - Functions need proper Firebase project authentication

## Solution Implemented

### ✅ 1. Fixed Firebase Functions (`functions/index.js`)

**Improvements Made:**
- ✅ **Enhanced error handling** - Added comprehensive try-catch blocks and logging
- ✅ **Email validation** - Added proper email validation before sending
- ✅ **HTML formatting** - Improved email templates with branded HTML formatting
- ✅ **Better logging** - Added detailed console logs for debugging
- ✅ **Robust user lookup** - Improved Firebase Auth user retrieval with error handling
- ✅ **Test function** - Added `testEmail` function for debugging

**Three Notification Types Fixed:**

#### 1. New Match Notifications
```javascript
// Triggers when swap_requests/{requestId} documents are created
exports.sendNewMatchNotification = functions.firestore
  .document('swap_requests/{requestId}')
  .onCreate(async (snapshot, context) => {
    // Sends: "You have a new book match."
  });
```

#### 2. Book Availability Notifications  
```javascript
// Triggers when books/{bookId} documents are created
exports.sendBookAvailabilityNotification = functions.firestore
  .document('books/{bookId}')
  .onCreate(async (snapshot, context) => {
    // Sends: "A book you want is available."
  });
```

#### 3. New Message Notifications
```javascript
// Triggers when messages/{messageId} documents are created
exports.sendNewMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    // Sends: "You have a new book swap message."
  });
```

### ✅ 2. Improved Email Service (`src/services/emailService.ts`)
- ✅ **Simplified interface** - Clean functions with exact message text as requested
- ✅ **Firestore integration** - Uses mail collection for Firebase Mail extension
- ✅ **Error handling** - Proper error catching and logging

### ✅ 3. Added Test Function
```javascript
exports.testEmail = functions.https.onCall(async (data, context) => {
  // Allows testing email notifications with different types
  // Usage: firebase functions:call testEmail --data='{"email":"test@example.com","testType":"match"}'
});
```

## Deployment Steps Required

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Set Firebase Project
```bash
firebase use --add
# Select your Firebase project ID
```

### Step 4: Deploy Functions
```bash
firebase deploy --only functions
```

### Step 5: Configure Firebase Mail Extension
1. Go to Firebase Console → Extensions
2. Install "Trigger Email" extension
3. Configure with your email service (Gmail, SendGrid, etc.)
4. Set up the mail collection trigger

## Testing the Email System

### Method 1: Use Test Function
```bash
firebase functions:call testEmail --data='{"email":"your-email@example.com","testType":"match"}'
```

### Method 2: Trigger Real Actions
1. **Test New Match**: Request a book swap
2. **Test Book Availability**: Add a new book when someone wants it  
3. **Test New Message**: Send a message in chat

### Method 3: Check Firestore Mail Collection
1. Go to Firebase Console → Firestore
2. Check the `mail` collection for queued emails
3. Verify email documents are being created

## Email Templates

All emails use branded HTML templates:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #436B95;">English Book Swap Jerusalem</h2>
  <p style="font-size: 16px; line-height: 1.6;">[MESSAGE]</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #666;">
    This is an automated notification from English Book Swap Jerusalem. 
    <br>Happy reading!
  </p>
</div>
```

## Troubleshooting

### Issue: Functions not triggering
**Solution**: Check Firebase Console → Functions → Logs for errors

### Issue: Emails not sending  
**Solution**: 
1. Verify Firebase Mail extension is installed and configured
2. Check Firestore `mail` collection for documents
3. Verify email service credentials in extension config

### Issue: User emails not found
**Solution**: Ensure users are properly authenticated and have email addresses in Firebase Auth

### Issue: Permission errors
**Solution**: Verify Firebase Functions have proper IAM permissions for Firestore and Auth

## Verification Steps

### ✅ 1. Functions Deployed
```bash
firebase functions:list
# Should show: sendNewMatchNotification, sendBookAvailabilityNotification, sendNewMessageNotification, testEmail
```

### ✅ 2. Extension Configured
- Firebase Console → Extensions → "Trigger Email" should be active
- Configuration should include email service credentials

### ✅ 3. Test Email Works
```bash
firebase functions:call testEmail --data='{"email":"test@example.com","testType":"test"}'
# Should return: {"success": true, "message": "Test email sent successfully"}
```

### ✅ 4. Real Notifications Work
1. Send a message in the app
2. Check recipient's email
3. Should receive: "You have a new book swap message."

## Current Status

### ✅ Completed
- **Firebase Functions improved** with robust error handling
- **Email templates enhanced** with branded HTML formatting  
- **All three notification types implemented** with exact messages
- **Test function added** for debugging
- **Code deployed to repository** (commit: fcf1d544)

### ⏳ Requires Manual Setup
- **Firebase Functions deployment** - Requires Firebase authentication
- **Firebase Mail Extension configuration** - Requires Firebase Console access
- **Email service setup** - Requires email provider credentials (Gmail, SendGrid, etc.)

## Next Steps

1. **Deploy Functions**: Run `firebase deploy --only functions`
2. **Configure Mail Extension**: Set up email service in Firebase Console
3. **Test System**: Use test function to verify email delivery
4. **Monitor Logs**: Check Firebase Console for any errors
5. **User Testing**: Have users test real notifications

## Expected Results

Once deployed and configured:
- ✅ **New swap requests** → "You have a new book match." email
- ✅ **New books added** → "A book you want is available." email  
- ✅ **New messages sent** → "You have a new book swap message." email
- ✅ **Professional HTML emails** with English Book Swap Jerusalem branding
- ✅ **Automatic triggering** - no manual intervention required
- ✅ **Error logging** for troubleshooting any issues

The email notification system is now ready for deployment and should work reliably once the Firebase Functions are deployed and the Mail extension is configured.

