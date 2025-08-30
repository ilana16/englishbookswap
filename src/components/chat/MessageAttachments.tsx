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
import { downloadFile, previewFile, copyFileUrl } from '@/utils/downloadHelper';
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

  const handleDownload = async (attachment: FileAttachment) => {
    try {
      await downloadFile(attachment);
      toast({
        title: "Download started",
        description: `Downloading ${attachment.name}...`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handleMediaClick = (attachment: FileAttachment) => {
    previewFile(attachment);
  };

  const handleCopyUrl = async (attachment: FileAttachment) => {
    try {
      await copyFileUrl(attachment);
      toast({
        title: "URL copied",
        description: "File URL copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id}>
          {isImageFile(attachment.type) ? (
            // Image Preview
            <div className="relative group">
              <img
                src={attachment.downloadUrl}
                alt={attachment.name}
                className="max-w-xs max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleMediaClick(attachment)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMediaClick(attachment);
                    }}
                    title="View full size"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(attachment);
                    }}
                    title="Download file"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUrl(attachment);
                    }}
                    title="Copy file URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-1 text-xs opacity-75">
                {attachment.name} • {formatFileSize(attachment.size)}
              </div>
            </div>
          ) : isVideoFile(attachment.type) ? (
            // Video Preview
            <div className="relative group">
              <video
                src={attachment.downloadUrl}
                className="max-w-xs max-h-48 rounded-lg"
                controls
                preload="metadata"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(attachment);
                    }}
                    className="bg-black/50 hover:bg-black/70 text-white border-none"
                    title="Download video"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUrl(attachment);
                    }}
                    className="bg-black/50 hover:bg-black/70 text-white border-none"
                    title="Copy video URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-1 text-xs opacity-75">
                {attachment.name} • {formatFileSize(attachment.size)}
              </div>
            </div>
          ) : (
            // File Attachment
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-opacity-80 ${
                isOwnMessage 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* File Icon */}
              <div className="flex-shrink-0 text-2xl">
                {getFileIcon(attachment.type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isOwnMessage ? 'text-white' : 'text-gray-900'
                }`}>
                  {attachment.name}
                </p>
                <p className={`text-xs ${
                  isOwnMessage ? 'text-white/80' : 'text-muted-foreground'
                }`}>
                  {formatFileSize(attachment.size)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1">
                <Button
                  variant={isOwnMessage ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  className={`flex-shrink-0 ${
                    isOwnMessage 
                      ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
                      : ''
                  }`}
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant={isOwnMessage ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleCopyUrl(attachment)}
                  className={`flex-shrink-0 ${
                    isOwnMessage 
                      ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
                      : ''
                  }`}
                  title="Copy file URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

