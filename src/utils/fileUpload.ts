import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/integrations/firebase/config';
import { FileAttachment } from '@/integrations/firebase/types';

// File type validation
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo', // .avi
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (increased for video files)
const MAX_FILES_PER_MESSAGE = 5;

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Allowed types: images, videos, PDFs, Word documents, and text files.`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    };
  }

  return { valid: true };
};

export const validateFiles = (files: File[]): { valid: boolean; error?: string } => {
  if (files.length > MAX_FILES_PER_MESSAGE) {
    return {
      valid: false,
      error: `Too many files. Maximum ${MAX_FILES_PER_MESSAGE} files allowed per message.`
    };
  }

  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
};

export const uploadFile = async (
  file: File,
  chatId: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileAttachment> => {
  const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fileName = `${fileId}_${file.name}`;
  const filePath = `chat-attachments/${chatId}/${userId}/${fileName}`;
  
  try {
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.({
      fileId,
      progress: 0,
      status: 'uploading'
    });

    const storageRef = ref(storage, filePath);
    
    // Upload file with metadata to help with CORS
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'uploadedBy': userId,
        'chatId': chatId,
        'originalName': file.name
      }
    };
    
    // Use uploadBytesResumable for better progress tracking and error handling
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            fileId,
            progress: Math.round(progress),
            status: 'uploading'
          });
        },
        (error) => {
          // Handle upload errors
          console.error('Upload error:', error);
          onProgress?.({
            fileId,
            progress: 0,
            status: 'error',
            error: `Upload failed: ${error.message}`
          });
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            onProgress?.({
              fileId,
              progress: 100,
              status: 'completed'
            });

            const attachment: FileAttachment = {
              id: fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              url: downloadURL,
              path: filePath,
              uploadedAt: new Date(),
              uploadedBy: userId
            };

            resolve(attachment);
          } catch (urlError) {
            console.error('Error getting download URL:', urlError);
            onProgress?.({
              fileId,
              progress: 0,
              status: 'error',
              error: 'Failed to get download URL'
            });
            reject(new Error('Failed to get download URL'));
          }
        }
      );
    });
  } catch (error) {
    console.error('File upload error:', error);
    onProgress?.({
      fileId,
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Upload failed'
    });
    throw error;
  }
};

export const uploadMultipleFiles = async (
  files: File[],
  chatId: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileAttachment[]> => {
  // Validate all files first
  const validation = validateFiles(files);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const uploadPromises = files.map(file => 
    uploadFile(file, chatId, userId, onProgress)
  );

  return Promise.all(uploadPromises);
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error for file deletion failures
  }
};

export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType === 'text/plain') return '📄';
  return '📎';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

export const isVideoFile = (fileType: string): boolean => {
  return fileType.startsWith('video/');
};

