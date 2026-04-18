// src/components/chat/DropZone.tsx
import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  children: React.ReactNode;
}

export default function DropZone({ onFileDrop, children }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = { current: 0 };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      dragCounterRef.current = 0;

      const file = e.dataTransfer.files[0];
      if (file) onFileDrop(file);
    },
    [onFileDrop]
  );

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">
              Solte o arquivo aqui
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
