# File and Media Sharing Feature Documentation

## Overview

This document describes the implementation of file and media sharing functionality in the Englishbookswap.com messaging system. Users can now share images, documents, and other files within their chat conversations.

## Features Implemented

### 1. File Upload Support
- **Supported File Types:**
  - Images: JPG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX, TXT
- **File Size Limit:** 10MB per file
- **Multiple Files:** Up to 5 files per message
- **Drag & Drop:** Users can drag files directly into the upload area

### 2. File Storage
- **Backend:** Firebase Storage
- **File Organization:** Files are stored in `/chat-attachments/{chatId}/{userId}/` structure
- **Security:** Files are accessible only to authenticated users
- **URLs:** Secure download URLs with Firebase authentication

### 3. User Interface
- **Upload Component:** Paperclip icon button for file selection
- **Preview:** Image thumbnails and file icons with size information
- **Progress Tracking:** Real-time upload progress indicators
- **Message Display:** Inline attachment rendering in chat bubbles

## Technical Implementation

### Data Models

#### FileAttachment Interface
```typescript
interface FileAttachment {
  id: string;           // Unique identifier
  name: string;         // Original filename
  size: number;         // File size in bytes
  type: string;         // MIME type
  url: string;          // Storage path
  downloadUrl?: string; // Firebase download URL
}
```

#### Updated Message Interface
```typescript
interface Message {
  chat_id: string;
  created_at: string;
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  attachments?: FileAttachment[]; // New field
}
```

### Key Components

#### 1. FileUpload Component (`/src/components/chat/FileUpload.tsx`)
- Handles file selection and validation
- Manages upload progress
- Provides drag-and-drop functionality
- Shows file previews before upload

#### 2. MessageAttachments Component (`/src/components/chat/MessageAttachments.tsx`)
- Renders attachments in message bubbles
- Displays image previews
- Provides download buttons for documents
- Handles different file types appropriately

#### 3. File Upload Utilities (`/src/utils/fileUpload.ts`)
- File validation functions
- Firebase Storage upload logic
- Progress tracking
- File type detection and icon mapping

### Backend Changes

#### Updated sendMessage Function
```typescript
export const sendMessage = async (chatId, content, senderId, attachments = []) => {
  // ... existing logic
  const messageData = {
    chat_id: chatId,
    content: content,
    sender_id: senderId,
    sender_name: senderName,
    created_at: serverTimestamp(),
    attachments: attachments // New field
  };
  // ... rest of implementation
};
```

#### Firebase Storage Integration
- Files uploaded to `/chat-attachments/{chatId}/{userId}/{filename}`
- Automatic generation of secure download URLs
- File cleanup utilities for future maintenance

## Security Considerations

### File Validation
- **Type Checking:** Only allowed MIME types are accepted
- **Size Limits:** 10MB maximum per file, 5 files per message
- **Malicious File Prevention:** File type validation on both client and server

### Access Control
- **Authentication Required:** Only authenticated users can upload/download
- **Chat Participation:** Users can only access files from chats they participate in
- **Firebase Security Rules:** Storage rules enforce proper access control

### Privacy
- **Secure URLs:** Download URLs are generated with Firebase authentication
- **No Direct Access:** Files cannot be accessed without proper authentication
- **Automatic Cleanup:** Orphaned files can be cleaned up via maintenance scripts

## User Experience

### Upload Flow
1. User clicks paperclip icon or drags files to upload area
2. Files are validated for type and size
3. Upload progress is shown for each file
4. Successfully uploaded files appear as "ready to send"
5. User can send message with or without text content
6. Attachments appear in the chat immediately

### Viewing Attachments
- **Images:** Display as thumbnails with click-to-expand
- **Documents:** Show with file icon, name, and size
- **Download:** One-click download for all file types
- **Mobile Responsive:** Optimized display for mobile devices

## Error Handling

### Upload Errors
- **File Too Large:** Clear error message with size limit
- **Invalid Type:** List of supported file types shown
- **Network Issues:** Retry mechanism and error notifications
- **Storage Quota:** Graceful handling of storage limits

### Display Errors
- **Missing Files:** Graceful degradation if file is deleted
- **Load Failures:** Fallback to filename display
- **Permission Issues:** Clear error messages

## Performance Optimizations

### Upload Performance
- **Parallel Uploads:** Multiple files uploaded simultaneously
- **Progress Tracking:** Real-time feedback to users
- **Compression:** Images automatically optimized by Firebase

### Display Performance
- **Lazy Loading:** Images loaded only when visible
- **Thumbnail Generation:** Automatic thumbnail creation for images
- **Caching:** Browser caching of downloaded files

## Future Enhancements

### Potential Improvements
1. **File Compression:** Client-side image compression before upload
2. **Video Support:** Add support for video file sharing
3. **File Search:** Search through shared files in conversations
4. **Bulk Download:** Download all files from a conversation
5. **File Expiration:** Automatic cleanup of old files
6. **Advanced Preview:** PDF preview without download

### Monitoring and Analytics
1. **Upload Success Rate:** Track upload failures and reasons
2. **File Type Usage:** Monitor which file types are most popular
3. **Storage Usage:** Track storage consumption per user/chat
4. **Performance Metrics:** Monitor upload speeds and user experience

## Maintenance

### Regular Tasks
1. **Storage Cleanup:** Remove orphaned files from deleted chats
2. **Security Audits:** Review file access patterns
3. **Performance Monitoring:** Track upload/download speeds
4. **User Feedback:** Monitor support requests related to file sharing

### Troubleshooting
- **Upload Failures:** Check Firebase Storage configuration and quotas
- **Permission Issues:** Verify Firebase Security Rules
- **Display Problems:** Check file URL generation and expiration
- **Performance Issues:** Monitor Firebase Storage bandwidth usage

## Configuration

### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-attachments/{chatId}/{userId}/{fileName} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/chats/$(chatId)) &&
        resource.data.participants.hasAny([request.auth.uid]);
    }
  }
}
```

### Environment Variables
- Firebase configuration already set up in `/src/integrations/firebase/config.ts`
- Storage bucket: `books-794a8.appspot.com`
- No additional environment variables required

## Testing

### Manual Testing Checklist
- [ ] Upload single image file
- [ ] Upload multiple files at once
- [ ] Upload different file types (PDF, DOC, TXT)
- [ ] Test file size limits (try uploading >10MB file)
- [ ] Test file type restrictions (try uploading unsupported type)
- [ ] Verify drag and drop functionality
- [ ] Test message sending with only attachments (no text)
- [ ] Test message sending with both text and attachments
- [ ] Verify attachment display in sent messages
- [ ] Verify attachment display in received messages
- [ ] Test file download functionality
- [ ] Test image preview functionality
- [ ] Verify mobile responsiveness
- [ ] Test error handling for network issues

### Automated Testing
Future implementation could include:
- Unit tests for file validation functions
- Integration tests for upload/download flows
- End-to-end tests for complete user workflows
- Performance tests for large file uploads

This implementation provides a robust, secure, and user-friendly file sharing system that enhances the communication capabilities of the Englishbookswap.com platform while maintaining security and performance standards.

