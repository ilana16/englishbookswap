import React from 'react';
import { FileAttachment } from '@/integrations/firebase/types';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { 
  getFileIcon, 
  formatFileSize, 
  isImageFile 
} from '@/utils/fileUpload';

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

  const handleDownload = (attachment: FileAttachment) => {
    if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank');
    }
  };

  const handleImageClick = (attachment: FileAttachment) => {
    if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank');
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
                onClick={() => handleImageClick(attachment)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleImageClick(attachment)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
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

              {/* Download Button */}
              <Button
                variant={isOwnMessage ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleDownload(attachment)}
                className={`flex-shrink-0 ${
                  isOwnMessage 
                    ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
                    : ''
                }`}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

