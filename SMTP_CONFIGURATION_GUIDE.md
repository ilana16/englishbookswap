# SMTP Configuration Guide - English Book Swap Jerusalem

## 📧 **Step-by-Step Gmail SMTP Setup**

### **Step 1: Create Gmail App Password**

1. **Go to your Google Account**:
   - Visit: https://myaccount.google.com/
   - Sign in with the Gmail account you want to use for sending emails

2. **Enable 2-Step Verification** (if not already enabled):
   - Click **Security** in the left sidebar
   - Under "Signing in to Google", click **2-Step Verification**
   - Follow the prompts to enable it (required for App Passwords)

3. **Generate App Password**:
   - Still in **Security** section
   - Under "Signing in to Google", click **App passwords**
   - You might need to sign in again
   - In the "Select app" dropdown, choose **Mail**
   - In the "Select device" dropdown, choose **Other (Custom name)**
   - Type: **English Book Swap Email Service**
   - Click **Generate**

4. **Copy the App Password**:
   - Google will show a 16-character password like: `abcd efgh ijkl mnop`
   - **IMPORTANT**: Copy this password immediately - you won't see it again!
   - Remove spaces, so it becomes: `abcdefghijklmnop`

---

### **Step 2: Configure the Email Service**

I'll now update the deployed email service with your SMTP credentials.

**Which Gmail account do you want to use for sending emails?**
- This will be the "from" address that users see
- Recommended: Use a dedicated email like `englishbookswap@gmail.com` or your personal Gmail

**Please provide:**
1. **Gmail address**: (e.g., `your-email@gmail.com`)
2. **App Password**: (the 16-character password from Step 1)

Once you provide these, I'll configure the service immediately and test it!

---

### **Step 3: Alternative SMTP Options**

If you prefer not to use Gmail, here are other options:

#### **SendGrid (Professional)**
- Free tier: 100 emails/day
- More reliable for high volume
- Setup: Create account → Get API key → Configure service

#### **Mailgun (Developer-Friendly)**
- Free tier: 5,000 emails/month
- Great API and documentation
- Setup: Create account → Get API credentials → Configure service

#### **Outlook/Hotmail SMTP**
- SMTP Server: `smtp-mail.outlook.com`
- Port: 587
- Same app password process as Gmail

---

## 🔧 **Technical Details**

### **Current Email Service Configuration**
- **Service URL**: https://77h9ikc6jdlv.manus.space
- **SMTP Server**: smtp.gmail.com (Port 587)
- **Security**: TLS encryption
- **Authentication**: Username/Password (App Password)

### **Environment Variables Needed**
```bash
SENDER_EMAIL=your-gmail@gmail.com
SENDER_PASSWORD=your-app-password
```

### **Test Command**
Once configured, you can test with:
```bash
curl -X POST https://77h9ikc6jdlv.manus.space/api/email/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"ilana.cunningham16@gmail.com","testType":"message"}'
```

---

## 🎯 **What Happens Next**

1. **You provide Gmail credentials** → I configure the service
2. **I test email delivery** → Confirm emails are sending
3. **You test in the app** → Send a message, add a book, create swap
4. **Ilana receives emails** → All three notification types working!

---

## 🚨 **Security Notes**

- **App Passwords are safe**: They're designed for applications
- **Limited scope**: Only for email sending, not account access
- **Revocable**: You can revoke the App Password anytime in Google Account settings
- **Encrypted**: All email communication uses TLS encryption

---

## ❓ **Troubleshooting**

### **Common Issues**
- **"Invalid credentials"**: Double-check App Password (no spaces)
- **"2-Step Verification required"**: Enable it in Google Account
- **"App Passwords not available"**: Make sure 2-Step Verification is on
- **"Less secure app access"**: Use App Password, not regular password

### **Testing Steps**
1. Test service health: `/api/email/health`
2. Test email sending: `/api/email/test-email`
3. Test in application: Send a chat message
4. Check email inbox: Look for notification

---

**Ready to configure? Please provide your Gmail address and App Password, and I'll set it up immediately!** 🚀

