// File utility functions for Missing Cashback invoice uploads

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Allowed file types for invoice upload
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf'
];

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Max files: 3
export const MAX_FILES = 3;

/**
 * Validate a file for invoice upload
 */
export const validateFile = (file: File): FileValidationResult => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPEG, PNG, GIF, PDF`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: 2MB`
    };
  }

  return { valid: true };
};

/**
 * Convert File to base64 string (without data URL prefix)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      
      // Validate base64 output
      if (!base64 || base64.length === 0) {
        console.error('[fileUtils] Empty base64 result for file:', file.name);
        reject(new Error('Failed to convert file to base64'));
        return;
      }
      
      console.log(`[fileUtils] Converted ${file.name}: ${file.size} bytes -> ${base64.length} base64 chars`);
      resolve(base64);
    };
    reader.onerror = (error) => {
      console.error('[fileUtils] FileReader error:', error);
      reject(error);
    };
  });
};

/**
 * Validate base64 string format
 */
export const validateBase64 = (base64: string): boolean => {
  if (!base64 || base64.length === 0) {
    return false;
  }
  
  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(base64);
};

/**
 * Calculate expected decoded size from base64 length
 */
export const getDecodedSize = (base64Length: number): number => {
  // Base64 encoding increases size by ~33%
  // Every 4 base64 chars = 3 bytes
  return Math.floor((base64Length * 3) / 4);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};
