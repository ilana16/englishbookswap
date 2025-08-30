import { FileAttachment } from '@/integrations/firebase/types';

/**
 * Enhanced file download utility that handles different file types and browsers
 */
export const downloadFile = async (attachment: FileAttachment): Promise<void> => {
  if (!attachment.downloadUrl) {
    throw new Error('No download URL available for this file');
  }

  try {
    // For modern browsers, use fetch to download the file
    const response = await fetch(attachment.downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Create object URL for the blob
    const objectUrl = URL.createObjectURL(blob);
    
    // Create temporary anchor element
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = attachment.name;
    link.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    URL.revokeObjectURL(objectUrl);
    
  } catch (error) {
    console.error('Error downloading file with fetch:', error);
    
    // Fallback: use direct link download
    try {
      const link = document.createElement('a');
      link.href = attachment.downloadUrl;
      link.download = attachment.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      // Last resort: open in new tab
      window.open(attachment.downloadUrl, '_blank');
    }
  }
};

/**
 * Download multiple files as a zip (future enhancement)
 */
export const downloadMultipleFiles = async (attachments: FileAttachment[]): Promise<void> => {
  // For now, download files individually
  // Future enhancement: create zip file
  for (const attachment of attachments) {
    await downloadFile(attachment);
    // Add small delay between downloads to avoid overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file can be previewed in browser
 */
export const canPreviewInBrowser = (fileType: string): boolean => {
  const previewableTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain'
  ];
  
  return previewableTypes.includes(fileType);
};

/**
 * Open file in new tab for preview
 */
export const previewFile = (attachment: FileAttachment): void => {
  if (attachment.downloadUrl) {
    window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Copy file URL to clipboard
 */
export const copyFileUrl = async (attachment: FileAttachment): Promise<void> => {
  if (!attachment.downloadUrl) {
    throw new Error('No URL available for this file');
  }

  try {
    await navigator.clipboard.writeText(attachment.downloadUrl);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = attachment.downloadUrl;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

