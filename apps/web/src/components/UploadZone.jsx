import React, { useId, useState } from 'react';
import { Upload, X, FileImage } from 'lucide-react';
import { compressUploadImage, uploadImageLimits } from '@/lib/compressUploadImage.js';

const supportedImageTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif',
]);

const UploadZone = ({ onFilesChange, maxFiles = 5, accept = "image/*", label = "Upload files" }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const uploadId = useId();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    e.target.value = '';
    addFiles(selectedFiles);
  };

  const addFiles = async (newFiles) => {
    if (isCompressing) return;
    setError('');
    const validFiles = newFiles.filter(file => {
      if (accept === "image/*") {
        return supportedImageTypes.has(file.type.toLowerCase());
      }
      return true;
    });
    if (validFiles.length !== newFiles.length) {
      setError('Sebagian file ditolak. Gunakan JPG, PNG, WebP, AVIF, HEIC, atau HEIF.');
    }

    const availableSlots = Math.max(0, maxFiles - files.length);
    const selectedFiles = validFiles.slice(0, availableSlots);
    if (!selectedFiles.length) {
      if (availableSlots === 0) setError(`Maksimal ${maxFiles} foto.`);
      return;
    }

    setIsCompressing(true);
    try {
      const compressedFiles = [];
      for (const file of selectedFiles) {
        if (file.size > uploadImageLimits.maxSourceBytes) {
          throw new Error(`${file.name} melebihi batas sumber 25 MB.`);
        }
        compressedFiles.push(await compressUploadImage(file));
      }
      const updatedFiles = [...files, ...compressedFiles];
      const totalBytes = updatedFiles.reduce((total, file) => total + file.size, 0);
      if (totalBytes > uploadImageLimits.maxTotalBytes) {
        throw new Error('Total foto setelah kompresi masih terlalu besar. Kurangi jumlah foto.');
      }
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    } catch (uploadError) {
      setError(uploadError.message || 'Foto gagal dikompres.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id={uploadId}
          disabled={isCompressing}
        />
        <label htmlFor={uploadId} className={isCompressing ? 'cursor-wait' : 'cursor-pointer'}>
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground font-medium mb-2">{label}</p>
          <p className="text-sm text-muted-foreground">
            {isCompressing ? 'Mengompres foto...' : 'Drag & drop atau klik untuk memilih file'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Maksimal {maxFiles} file • otomatis dikompres, resolusi hingga 1600 px
          </p>
        </label>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {file.name} • {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
