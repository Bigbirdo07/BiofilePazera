import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  onFileSelected: (files: { file?: File; path: string; name: string; content?: string }[]) => void;
  label?: string;
  description?: string;
  currentValue?: string;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '.fasta,.fa,.fastq,.fq,.gz,.pdb,.cif,.txt',
  multiple = false,
  onFileSelected,
  label = 'Drop FASTA, FASTQ, or PDB file here',
  description = 'Supports .fasta, .fastq, .gz, .pdb files',
  currentValue,
  onClear,
  className = '',
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processSelectedFiles = async (filesList: FileList | File[]) => {
    const results: { file?: File; path: string; name: string; content?: string }[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      let content: string | undefined = undefined;
      // Read text content if not gzipped or giant
      if (file.size < 20 * 1024 * 1024 && !file.name.endsWith('.gz')) {
        try {
          content = await file.text();
        } catch {
          // Ignore binary/read errors
        }
      }
      results.push({
        file,
        path: (file as File & { path?: string }).path || file.name,
        name: file.name,
        content,
      });
    }
    if (results.length > 0) {
      onFileSelected(results);
    }
  };

  const handleBrowseClick = async () => {
    // Attempt Tauri native dialog first
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const selected = await open({
          multiple,
          filters: [
            { name: 'Genomic & Structure Files', extensions: ['fasta', 'fa', 'fastq', 'fq', 'gz', 'pdb', 'cif', 'txt'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected];
          const results = paths.map((p) => ({
            path: p,
            name: p.split('/').pop() || p.split('\\').pop() || p,
          }));
          onFileSelected(results);
          return;
        }
      }
    } catch {
      // Fallback to standard web file input
    }

    // Trigger HTML5 file input
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  if (compact) {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex-1 flex items-center px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 truncate">
          <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 mr-2 shrink-0" />
          <span className="truncate">{currentValue || 'No file selected'}</span>
        </div>
        {currentValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleBrowseClick}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
        >
          Browse...
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer select-none ${
        isDragging
          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 scale-[1.01]'
          : currentValue
          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-sky-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        {currentValue ? (
          <>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-base flex items-center justify-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate max-w-md">{currentValue}</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                File loaded successfully — Click or drop another file to replace
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/60 rounded-full text-sky-600 dark:text-sky-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              Select File from Computer
            </button>
          </>
        )}
      </div>
    </div>
  );
};
