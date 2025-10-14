import { cn } from "@/lib/utils";
import React, {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { FaSpinner } from "react-icons/fa6";

type ComboBoxContextType = {
  isOpen: boolean;
  toggleOpen: () => void;
  close: () => void;
  open: () => void;
  value: string | null;
  setValue: (value: string | null) => void;
};

const ComboBoxContext = createContext<ComboBoxContextType | undefined>(
  undefined
);

const ComboBoxProvider: React.FC<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialValue?: string;
  onValueChange: (value: string | null) => void;
  children: React.ReactNode;
}> = ({ isOpen, setIsOpen, initialValue, onValueChange, children }) => {
  const [value, setValue] = React.useState<string | null>(initialValue ?? null);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const open = useCallback(() => setIsOpen(true), [setIsOpen]);

  useEffect(() => {
    onValueChange(value);
  }, [value, onValueChange]);

  return (
    <ComboBoxContext.Provider
      value={{ isOpen, toggleOpen, close, open, value, setValue }}
    >
      {children}
    </ComboBoxContext.Provider>
  );
};

const useComboBox = (): ComboBoxContextType => {
  const context = useContext(ComboBoxContext);
  if (!context) {
    throw new Error("useComboBox must be used within a ComboBoxProvider");
  }
  return context;
};

const ComboBox: React.FC<{
  initialValue?: string;
  onValueChange: (value: string | null) => void;
  className?: string;
  children?: React.ReactNode;
}> = ({ initialValue, onValueChange, className, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <ComboBoxProvider
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      initialValue={initialValue}
      onValueChange={onValueChange}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn("relative", className)}>{children}</div>
      </Popover>
    </ComboBoxProvider>
  );
};

const ComboBoxInput: React.FC<
  { placeholder?: string; className?: string } & Omit<
    ComponentProps<"input">,
    "className" | "placeholder" | "value" | "type" | "onChange"
  >
> = ({ placeholder, className, ...props }) => {
  const { value } = useComboBox();
  return (
    <PopoverTrigger className="w-full relative">
      <Input
        className={className}
        placeholder={placeholder}
        value={value ?? ""}
        readOnly
        {...props}
      />
    </PopoverTrigger>
  );
};

const ComboBoxOptions: React.FC<{
  searchable?: boolean;
  isSearching?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  emptyLabel?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({
  emptyLabel,
  searchable,
  isSearching = false,
  searchPlaceholder,
  onSearchChange,
  children,
  className,
}) => {
  return (
    <PopoverContent
      className={cn("w-[var(--radix-popover-trigger-width)]", className)}
      align="start"
      side="bottom"
    >
      <Command className="w-full">
        {searchable && (
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={onSearchChange}
          />
        )}
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="flex justify-center items-center w-full">
                <FaSpinner className="animate-spin" />
              </div>
            ) : (
              emptyLabel ?? "No results found."
            )}
          </CommandEmpty>
          <CommandGroup>{children}</CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );
};

const ComboBoxOption: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const { setValue, close } = useComboBox();
  const handleSelect = (value: string) => {
    setValue(value);
    close();
  };
  return (
    <CommandItem onSelect={handleSelect} value={value}>
      {children}
    </CommandItem>
  );
};

export { ComboBox, ComboBoxInput, ComboBoxOptions, ComboBoxOption };
