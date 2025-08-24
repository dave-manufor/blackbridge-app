import * as React from "react";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { IoCloseCircle } from "react-icons/io5";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center h-9 w-full min-w-0 rounded-md border border-input bg-transparent shadow-xs px-3 py-1",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
    >
      <input
        type={showPassword ? "text" : "password"}
        data-slot="input"
        className={cn(
          "flex-1 bg-transparent outline-none border-none px-0 text-base md:text-sm",
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="ml-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default PasswordInput;

function ChipInput({
  allowDuplicates = false,
  onChange,
  onError,
  validation,
  ...props
}: {
  allowDuplicates?: boolean;
  onChange?: (chips: string[]) => void;
  onError?: (message: string | null) => void;
  validation?: {
    test: (value: string) => boolean;
    message: string;
  }[];
} & Omit<React.ComponentProps<"input">, "onChange" | "onError">) {
  const [chips, setChips] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle chip creation
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      let valid = true;
      if (value) {
        // Validate string
        if (validation) {
          for (const rule of validation) {
            if (!rule.test(value)) {
              valid = false;
              onError?.(rule.message);
              break;
            }
          }
        }

        // Check for duplicates
        if (!allowDuplicates && chips.includes(value)) {
          valid = false;
        }

        // Update if valid
        if (valid) {
          setChips((prev) => {
            const newChips = [...prev, value];
            onChange?.(newChips);
            return newChips;
          });
          onError?.(null);
          e.currentTarget.value = "";
        }
      }
    } else if (e.key === "Backspace") {
      // Handle chip deletion
      if (e.currentTarget.value === "") {
        handleRemove(chips.length - 1);
        // Remove error for empty input
      } else if (e.currentTarget.value.length === 1) {
        onError?.(null);
      }
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    const value = e.currentTarget.value.trim();
    if (value) {
      let valid = true;
      if (validation) {
        for (const rule of validation) {
          if (!rule.test(value)) {
            valid = false;
            onError?.(rule.message);
            break;
          }
        }
      }

      if (!allowDuplicates && chips.includes(value)) {
        valid = false;
      }

      if (valid) {
        setChips((prev) => {
          const newChips = [...prev, value];
          onChange?.(newChips);
          return newChips;
        });
        onError?.(null);
        e.currentTarget.value = "";
      }
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const pastedData = e.clipboardData.getData("text");
    let values: string[] = [];
    if (pastedData.includes(",")) {
      values = pastedData.split(",").map((item) => item.trim());
    } else {
      values = pastedData.split(" ").map((item) => item.trim());
    }
    let valid = true;

    for (const value of values) {
      if (validation) {
        for (const rule of validation) {
          if (!rule.test(value)) {
            valid = false;
            onError?.(rule.message);
            break;
          }
        }
      }

      if (!allowDuplicates && chips.includes(value)) {
        valid = false;
      }
    }

    if (valid) {
      setChips((prev) => {
        const newChips = [...prev, ...values];
        onChange?.(newChips);
        return newChips;
      });
      onError?.(null);
      e.currentTarget.value = "";
    }

    e.preventDefault();
  };

  const handleRemove = (index: number) => {
    setChips((prev) => {
      const newChips = prev.filter((_, i) => i !== index);
      onChange?.(newChips);
      return newChips;
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 w-full">
          {chips.map((chip, index) => (
            <span
              key={index}
              className="bg-neutral-200 text-neutral-900 px-2 py-1 rounded-sm text-xs gap-1 flex items-center"
            >
              {chip}
              <IoCloseCircle
                className="text-sm cursor-pointer"
                onClick={() => handleRemove(index)}
              />
            </span>
          ))}
        </div>
      )}
      <Input
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        type="text"
        {...props}
      />
    </div>
  );
}

export { Input, PasswordInput, ChipInput };
