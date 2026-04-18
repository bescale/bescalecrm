import { useState } from "react";
import { Plus } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiReactionPicker({ onSelect }: EmojiReactionPickerProps) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="flex items-center gap-1 p-1">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="hover:scale-125 transition-transform p-1 text-lg"
        >
          {emoji}
        </button>
      ))}
      <Popover open={showFull} onOpenChange={setShowFull}>
        <PopoverTrigger asChild>
          <button className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-auto p-0 border-none shadow-xl">
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => {
              onSelect(e.native);
              setShowFull(false);
            }}
            theme="auto"
            locale="pt"
            previewPosition="none"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
