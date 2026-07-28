"use client";

import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const InputBox = forwardRef<HTMLInputElement, InputBoxProps>(
  ({ onSend, disabled }, ref) => {
    const [input, setInput] = useState("");

    const handleSend = () => {
      if (input.trim()) {
        onSend(input);
        setInput("");
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <div className="flex gap-2 w-full">
        <Input
          ref={ref}
          type="text"
          placeholder="Type your answer..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1 rounded-xl"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="rounded-xl px-4"
        >
          Send
        </Button>
      </div>
    );
  }
);

InputBox.displayName = "InputBox";