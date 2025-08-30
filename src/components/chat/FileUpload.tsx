import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, X, Upload, FileText, Image, Video } from 'lucide-react';
import { FileAttachment } from '@/integrations/firebase/types';
import { 
  validateFiles, 
  uploadMultipleFiles, 
  UploadProgress,
  getFileIcon,
  formatFileSize,
  isImageFile,
  isVideoFile
} from '@/utils/fileUpload';
import { toast } from '@/components/ui/use-toast';

interface FileUploadProps {
  chatId: string;
  userId: string;
  onFilesUploaded: (attachments: FileAttachment[]) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  id: string;
  preview?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  chatId,
  userId,
  onFilesUploaded,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      toast({
        title: "File validation error",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Create file previews
    const previews: FilePreview[] = files.map(file => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const preview: FilePreview = { file, id };

      // Create preview for images and videos
      if (isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.preview = e.target?.result as string;
          setSelectedFiles(prev => 
            prev.map(p => p.id === id ? { ...p, preview: preview.preview } : p)
          );
        };
        reader.readAsDataURL(file);
      } else if (isVideoFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.preview = e.target?.result as string;
          setSelectedFiles(prev => 
            prev.map(p => p.id === id ? { ...p, preview: preview.preview } : p)
          );
        };
        reader.readAsDataURL(file);
      }

      return preview;
    });

    setSelectedFiles(prev => [...prev, ...previews]);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const files = selectedFiles.map(f => f.file);
      
      const attachments = await uploadMultipleFiles(
        files,
        chatId,
        userId,
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [progress.fileId]: progress
          }));
        }
      );

      onFilesUploaded(attachments);
      setSelectedFiles([]);
      setUploadProgress({});
      
      toast({
        title: "Files uploaded successfully",
        description: `${attachments.length} file${attachments.length > 1 ? 's' : ''} uploaded`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    
    if (files.length > 0) {
      // Simulate file input change
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        input.files = dt.files;
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-3">
      {/* File Selection */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />

        {selectedFiles.length > 0 && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="bg-bookswap-darkblue hover:bg-bookswap-darkblue/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Drag and Drop Area */}
      {selectedFiles.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-bookswap-blue transition-colors"
        >
          Drop files here or click the paperclip to select files
          <br />
          <span className="text-xs">Supports: Images, Videos, PDFs, Word docs, Text files (max 50MB each)</span>
        </div>
      )}

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {selectedFiles.map((filePreview) => (
            <div
              key={filePreview.id}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border"
            >
              {/* File Icon/Preview */}
              <div className="flex-shrink-0">
                {filePreview.preview ? (
                  isImageFile(filePreview.file.type) ? (
                    <img
                      src={filePreview.preview}
                      alt={filePreview.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : isVideoFile(filePreview.file.type) ? (
                    <video
                      src={filePreview.preview}
                      className="w-10 h-10 object-cover rounded"
                      muted
                    />
                  ) : null
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    {isImageFile(filePreview.file.type) ? (
                      <Image className="h-5 w-5 text-gray-500" />
                    ) : isVideoFile(filePreview.file.type) ? (
                      <Video className="h-5 w-5 text-gray-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{filePreview.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(filePreview.file.size)}
                </p>
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress[filePreview.id] && (
                <div className="flex-shrink-0 text-xs">
                  {uploadProgress[filePreview.id].status === 'uploading' && (
                    <span className="text-blue-600">
                      {uploadProgress[filePreview.id].progress}%
                    </span>
                  )}
                  {uploadProgress[filePreview.id].status === 'completed' && (
                    <span className="text-green-600">✓</span>
                  )}
                  {uploadProgress[filePreview.id].status === 'error' && (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
              )}

              {/* Remove Button */}
              {!uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(filePreview.id)}
                  className="flex-shrink-0 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

