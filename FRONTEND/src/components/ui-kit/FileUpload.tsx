import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertTriangle, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from './Toast';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  allowedMimeTypes?: string[]; // e.g. ['image/png', 'image/jpeg', 'application/pdf']
  maxSizeMb?: number; // e.g. 5
  label?: string;
  id?: string;
}

export default function FileUpload({
  onFileSelect,
  allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
  maxSizeMb = 5,
  label = 'Upload evidence or proof document',
  id = 'file-upload'
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate and simulate upload
  const processFile = (file: File) => {
    setErrorMessage(null);

    // 1. Check MIME type
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
      const msg = `Unsupported file format (${file.type || 'unknown'}). Only ${allowedMimeTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} are supported.`;
      setErrorMessage(msg);
      toast('Upload failed', 'error', msg);
      return;
    }

    // 2. Check File size
    const maxSize = maxSizeMb * 1024 * 1024;
    if (file.size > maxSize) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max limit is ${maxSizeMb}MB.`;
      setErrorMessage(msg);
      toast('File limit exceeded', 'error', msg);
      return;
    }

    // Process valid file
    setSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress bars
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.round(Math.random() * 20 + 10);
      if (currentProgress >= 100) {
        setUploadProgress(100);
        setIsUploading(false);
        onFileSelect(file);
        clearInterval(interval);
        toast('File uploaded successfully', 'success', `"${file.name}" has been loaded and scanned for security.`);
      } else {
        setUploadProgress(currentProgress);
      }
    }, 150);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preview generator (PDF icon or Image preview)
  const renderPreview = () => {
    if (!selectedFile) return null;

    const isImage = selectedFile.type.startsWith('image/');
    const fileUrl = isImage ? URL.createObjectURL(selectedFile) : '';

    return (
      <div className="flex items-center gap-3 bg-neutral-bg/40 border border-neutral-border rounded-xl p-3 text-left">
        <div className="h-12 w-12 rounded-lg border border-neutral-border overflow-hidden shrink-0 flex items-center justify-center bg-white relative">
          {isImage ? (
            <img src={fileUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <File className="h-6 w-6 text-primary-teal" />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-xs font-bold text-neutral-text-dark truncate leading-none">
            {selectedFile.name}
          </p>
          <p className="text-[10px] text-neutral-text-muted mt-1 font-semibold">
            {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
          </p>
        </div>
        {!isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-neutral-text-muted transition shrink-0 border border-transparent hover:border-red-100"
            title="Remove file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 w-full" id={id}>
      <span className="text-[11px] font-black uppercase text-neutral-text-muted tracking-wider block text-left">
        {label}
      </span>

      {/* Drag & Drop Input Area */}
      {!selectedFile && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerSelect}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition text-center select-none ${
            isDragActive
              ? 'border-primary-teal bg-primary-teal/5'
              : 'border-neutral-border hover:border-primary-teal/50 bg-neutral-bg/10 hover:bg-neutral-bg/25'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={allowedMimeTypes.join(',')}
            onChange={handleManualSelect}
          />
          <UploadCloud className="h-7 w-7 text-neutral-text-muted animate-pulse" />
          <div>
            <p className="text-xs font-black text-neutral-text-dark">
              Drag & drop files here, or <span className="text-primary-teal">browse computer</span>
            </p>
            <p className="text-[10px] text-neutral-text-muted mt-1 font-semibold">
              Supports {allowedMimeTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} (Max {maxSizeMb}MB)
            </p>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && renderPreview()}

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black text-neutral-text-muted uppercase tracking-wider">
            <span>Uploading verification proof...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-teal transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error messages if any */}
      {errorMessage && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl text-left">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">
            {errorMessage}
          </span>
        </div>
      )}
    </div>
  );
}
