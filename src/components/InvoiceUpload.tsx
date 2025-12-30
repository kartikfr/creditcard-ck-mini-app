import React, { useRef } from 'react';
import { X, Upload, Image, FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateFile, formatFileSize, isImageFile, MAX_FILES } from '@/lib/fileUtils';
import { useToast } from '@/hooks/use-toast';

interface InvoiceUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  storeName: string;
  storeImage?: string;
  onContinue: () => void;
  onBack?: () => void;
  isUploading?: boolean;
  title?: string;
  description?: string;
  helpTitle?: string;
  helpImage?: string;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  files,
  onFilesChange,
  storeName,
  storeImage,
  onContinue,
  onBack,
  isUploading = false,
  title = 'Kindly Upload a Screenshot of Your Invoice',
  description = 'We will process and get back to you',
  helpTitle,
  helpImage
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach(file => {
      // Check max files limit
      if (files.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      newFiles.push(file);
    });

    if (errors.length > 0) {
      toast({
        title: 'File Upload Error',
        description: errors[0],
        variant: 'destructive'
      });
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(droppedFiles).forEach(file => {
      if (files.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      newFiles.push(file);
    });

    if (errors.length > 0) {
      toast({
        title: 'File Upload Error',
        description: errors[0],
        variant: 'destructive'
      });
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Store Logo */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-4">
          {storeImage ? (
            <img
              src={storeImage}
              alt={storeName}
              className="max-w-full max-h-full object-contain p-2"
            />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">
              {storeName.charAt(0)}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground text-center mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {description}
        </p>

        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 mb-4 text-center transition-colors hover:border-primary/50"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {files.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here or
              </p>
              <label className="inline-flex items-center gap-2 text-primary font-medium cursor-pointer hover:underline">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Plus className="w-4 h-4" />
                Add Photo
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Max {MAX_FILES} files • JPEG, PNG, GIF, PDF • Max 2MB each
              </p>
            </>
          ) : (
            <div className="space-y-3">
              {/* File Previews */}
              <div className="flex flex-wrap gap-3 justify-center">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-lg border overflow-hidden bg-muted/50"
                  >
                    {isImageFile(file) ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                ))}

                {/* Add More Button */}
                {files.length < MAX_FILES && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </label>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {files.length} of {MAX_FILES} files added
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          disabled={files.length === 0 || isUploading}
          className="w-full h-12 mb-4"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Continue'
          )}
        </Button>

        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go Back
          </button>
        )}

        {/* Help Section */}
        {helpTitle && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 text-center">
              {helpTitle}
            </h3>
            {helpImage ? (
              <div className="rounded-lg border overflow-hidden">
                <img
                  src={helpImage}
                  alt={helpTitle}
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Image className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Open your {storeName} app → Go to Orders → Select the order → Download Invoice
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceUpload;
