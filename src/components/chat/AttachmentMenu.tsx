// src/components/chat/AttachmentMenu.tsx
import { useRef } from "react";
import { Paperclip, Image, FileText, Contact } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttachmentMenuProps {
  onFileSelected: (file: File) => void;
  onContactClick: () => void;
}

const MEDIA_ACCEPT = "image/*,video/mp4,video/3gpp";
const DOC_ACCEPT =
  "application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function AttachmentMenu({
  onFileSelected,
  onContactClick,
}: AttachmentMenuProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={mediaInputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept={DOC_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground">
            <Paperclip className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => mediaInputRef.current?.click()}>
            <Image className="h-4 w-4 mr-2" />
            Imagem / Vídeo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onContactClick}>
            <Contact className="h-4 w-4 mr-2" />
            Contato
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
