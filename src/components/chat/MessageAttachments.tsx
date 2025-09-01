import React from 'react';
import { FileAttachment } from '@/integrations/firebase/types';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Copy } from 'lucide-react';
import { 
  getFileIcon, 
  formatFileSize, 
  isImageFile,
  isVideoFile 
} from '@/utils/fileUpload';
import { toast } from '@/components/ui/use-toast';

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
  isOwnMessage?: boolean;
}

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments,
  isOwnMessage = false
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleDirectDownload = (attachment: FileAttachment) => {
    try {
      // Use direct download link approach to bypass CORS
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Add to DOM temporarily
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${attachment.name}...`
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    }
  };

  const handlePreview = (attachment: FileAttachment) => {
    try {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Preview failed:', error);
      toast({
        title: "Preview failed",
        description: "Unable to open file preview",
        variant: "destructive"
      });
    }
  };

  const handleCopyUrl = async (attachment: FileAttachment) => {
    try {
      await navigator.clipboard.writeText(attachment.url);
      toast({
        title: "URL copied",
        description: "File URL copied to clipboard"
      });
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = attachment.url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        toast({
          title: "URL copied",
          description: "File URL copied to clipboard"
        });
      } catch (fallbackError) {
        toast({
          title: "Copy failed",
          description: "Unable to copy URL to clipboard",
          variant: "destructive"
        });
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="border border-border rounded-lg p-3 bg-muted/30 max-w-sm"
        >
          {/* Image Preview */}
          {isImageFile(attachment.type) && (
            <div className="mb-2 relative group">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '200px' }}
                onClick={() => handlePreview(attachment)}
                onError={(e) => {
                  console.error('Image load error:', e);
                  // Hide image on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              
              {/* Image hover controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePreview(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDirectDownload(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyUrl(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Video Preview */}
          {isVideoFile(attachment.type) && (
            <div className="mb-2 relative group">
              <video
                src={attachment.url}
                controls
                className="max-w-full h-auto rounded"
                style={{ maxHeight: '200px' }}
                onError={(e) => {
                  console.error('Video load error:', e);
                  // Show fallback on error
                  (e.target as HTMLVideoElement).style.display = 'none';
                }}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Video hover controls */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePreview(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDirectDownload(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyUrl(attachment)}
                  className="bg-white/90 text-black hover:bg-white"
                  title="Copy URL"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* File Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="text-lg">{getFileIcon(attachment.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" title={attachment.name}>
                  {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
            </div>

            {/* File Actions */}
            <div className="flex items-center space-x-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePreview(attachment)}
                className="h-8 w-8 p-0"
                title="Preview"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDirectDownload(attachment)}
                className="h-8 w-8 p-0"
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyUrl(attachment)}
                className="h-8 w-8 p-0"
                title="Copy URL"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

