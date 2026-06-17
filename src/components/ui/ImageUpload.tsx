import { useState, useRef, useCallback } from "react";
import { Upload, X, LoaderCircle, AlertCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type ImageUploadProps = {
  value: string;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function ImageUpload({ value, onChange, label = "Image", accept = ".jpg,.jpeg,.png,.webp" }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Allowed: JPG, PNG, WebP";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum size is 5MB";
    }
    return null;
  }, []);

  const upload = useCallback(async (file: File) => {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      onChange(data.url);
      toast.success("Image uploaded successfully");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onChange, validate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (e.target) e.target.value = "";
  }, [upload]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-white/50">{label}</label>}

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)]">
          <img src={value} alt="Preview" className="h-40 w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
            <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20">
              Replace
              <input ref={inputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-[var(--hub-blue)] bg-[var(--hub-blue)]/5"
              : "border-white/10 bg-[rgba(11,11,11,0.6)] hover:border-white/20"
          }`}
        >
          {uploading ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <Upload className="h-5 w-5 text-white/40" />
              </div>
              <p className="text-sm text-white/40">
                Drag image here or click to upload
              </p>
              <p className="text-[10px] text-white/20">JPG, PNG, WebP &middot; Max 5MB</p>
            </>
          )}
          <input ref={inputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
