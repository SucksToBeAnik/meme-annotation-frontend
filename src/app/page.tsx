"use client";

import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileImage,
  Loader2,
  FolderOpen,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
];

interface FileUploadResponse {
  total_files: number;
  successful_uploads: number;
  failed_uploads: number;
  skipped_uploads: number;
  results: Array<{
    filename: string;
    status: "success" | "error" | "skipped";
    error?: string;
    message?: string;
  }>;
  summary: {
    success_rate: string;
    successful_files: Array<{ filename: string; action: string }>;
    failed_files: Array<{ filename: string; error: string }>;
    skipped_files: Array<{ filename: string; message: string }>;
  };
}

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  status?: "pending" | "uploading" | "success" | "error" | "skipped";
  error?: string;
  progress?: number;
}

const formSchema = z.object({
  files: z
    .array(
      z
        .instanceof(File)
        .refine((file) => file.size <= MAX_FILE_SIZE, "File size exceeds 10MB")
        .refine(
          (file) => ACCEPTED_FILE_TYPES.includes(file.type as any),
          "Invalid file type"
        )
    )
    .max(2500, "You can attach up to 50 files only")
    .optional(),
});

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadResults, setUploadResults] = useState<FileUploadResponse | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const createFilePreview = (file: File): FileWithPreview => {
    const fileWithPreview = file as FileWithPreview;
    fileWithPreview.id = `${file.name}-${Date.now()}-${Math.random()}`;
    fileWithPreview.status = "pending";
    fileWithPreview.progress = 0;

    if (file.type.startsWith("image/")) {
      fileWithPreview.preview = URL.createObjectURL(file);
    }

    return fileWithPreview;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files)
      .filter((file) => {
        // Check file type
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type`);
          return false;
        }
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: File size exceeds 10MB`);
          return false;
        }
        return true;
      })
      .map(createFilePreview);

    const totalFiles = selectedFiles.length + newFiles.length;
    if (totalFiles > 2500) {
      toast.error(
        `Cannot upload more than 50 files. You selected ${totalFiles} files.`
      );
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    form.setValue("files", [...selectedFiles, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = selectedFiles.filter((file) => file.id !== fileId);
    setSelectedFiles(updatedFiles);
    form.setValue("files", updatedFiles);

    // Clean up preview URL
    const fileToRemove = selectedFiles.find((file) => file.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const clearAllFiles = () => {
    selectedFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setSelectedFiles([]);
    form.setValue("files", []);
    setUploadResults(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  async function handleSubmit(data: z.infer<typeof formSchema>) {
    const api_url = process.env.NEXT_PUBLIC_API_URL;
    if (!api_url) {
      toast.error("API URL is not defined in environment variables");
      return;
    }

    if (!data.files || data.files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsUploading(true);
    setUploadResults(null);

    // Update all files to uploading status
    setSelectedFiles((prev) =>
      prev.map((file) => ({ ...file, status: "uploading" as const }))
    );

    const formData = new FormData();
    data.files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`${api_url}/upload/memes`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      const result: FileUploadResponse = await response.json();
      setUploadResults(result);

      // Update file statuses based on results
      setSelectedFiles((prev) =>
        prev.map((file) => {
          console.log("Existing file:", file);
          const fileResult = result.results.find(
            (r) => r.filename === file.name
          );
          return {
            ...file,
            status: fileResult?.status || "error",
            error: fileResult?.error || fileResult?.message || "Upload failed",
          };
        })
      );

      toast.success(
        `Upload complete! ${result.successful_uploads} successful, ${result.failed_uploads} failed, ${result.skipped_uploads} skipped`
      );
    } catch (error) {
      console.error("Upload error:", error);
      setSelectedFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "error" as const,
          error: "Upload failed",
        }))
      );
      toast.error(
        `Error uploading files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileImage className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploading":
        return "border-blue-200 bg-blue-50";
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "skipped":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup preview URLs on unmount
      selectedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Meme Upload Center</h1>
        <p className="text-gray-600">
          Upload your meme images in bulk - up to 50 files at once
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="files"
            render={() => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  Select Images
                </FormLabel>
                <FormControl>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                      ${
                        isDragOver
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400 bg-gray-50"
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES.join(",")}
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //   @ts-expect-error
                      webkitdirectory={""}
                    />

                    <div className="space-y-4">
                      <div className="flex justify-center">
                        {isDragOver ? (
                          <FolderOpen className="h-12 w-12 text-blue-500" />
                        ) : (
                          <Upload className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          {isDragOver
                            ? "Drop files here"
                            : "Drag & drop files here"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          or click to browse • JPG, PNG, GIF, WEBP up to 10MB
                          each
                        </p>
                      </div>
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Selected Files ({selectedFiles.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(
                      file.status || "pending"
                    )}`}
                  >
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <FileImage className="h-6 w-6 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {file.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status || "pending")}
                      {!isUploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadResults && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Upload Results</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {uploadResults.total_files}
                  </p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    {uploadResults.successful_uploads}
                  </p>
                  <p className="text-xs text-gray-600">Success</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    {uploadResults.failed_uploads}
                  </p>
                  <p className="text-xs text-gray-600">Failed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-yellow-600">
                    {uploadResults.skipped_uploads}
                  </p>
                  <p className="text-xs text-gray-600">Skipped</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Success Rate: {uploadResults.summary.success_rate}
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              type="button"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={selectedFiles.length === 0 || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length} File
                  {selectedFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
