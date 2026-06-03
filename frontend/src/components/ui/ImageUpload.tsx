import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { LuUpload, LuX, LuImage, LuLoaderCircle } from 'react-icons/lu';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  aspectRatio?: number;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  isUploading?: boolean;
  isDeleting?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onUpload,
  onDelete,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  isUploading = false,
  isDeleting = false,
}) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      // Validate file type
      if (!acceptedFormats.includes(file.type)) {
        toast.error(`Invalid file type. Accepted: ${acceptedFormats.join(', ')}`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      try {
        await onUpload(file);
      } catch (error) {
        // Reset preview on error
        setPreview(currentImageUrl || null);
      }
    },
    [onUpload, currentImageUrl, maxSizeMB, acceptedFormats]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    multiple: false,
    disabled: isUploading || isDeleting,
  });

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
      setPreview(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative w-full max-w-md">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-neutral-200 bg-neutral-50">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            {(isUploading || isDeleting) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <LuLoaderCircle className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          {onDelete && !isUploading && !isDeleting && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={handleDelete}
            >
              <LuX className="mr-2 h-4 w-4" />
              Remove Image
            </Button>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full max-w-md aspect-square border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : "border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/30",
            (isUploading || isDeleting) && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            {isUploading ? (
              <>
                <LuLoaderCircle className="h-12 w-12 animate-spin text-primary-500" />
                <p className="text-sm font-medium text-neutral-700">Uploading...</p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                  <LuImage className="h-8 w-8 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} up to {maxSizeMB}MB
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2">
                  <LuUpload className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
