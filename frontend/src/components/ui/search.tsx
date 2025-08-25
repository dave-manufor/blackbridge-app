import { cn } from "@/lib/utils";
import { FaSearch } from "react-icons/fa";
import { Button } from "./button";
import { IoClose } from "react-icons/io5";
import { useRef } from "react";
import { LuLoaderCircle } from "react-icons/lu";

function SearchBar({
  search,
  setSearch,
  isLoading,
  className,
}: {
  search: string;
  setSearch: (value: string) => void;
  isLoading?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-md h-12 cursor-text dark:bg-input/30 border border-input bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
    >
      <FaSearch />
      <input
        ref={inputRef}
        className="outline-none border-0 focus:ring-0 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground grow"
        placeholder="Search by title, email or file name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <LuLoaderCircle className="animate-spin" />}
      {search && (
        <Button
          onClick={() => setSearch("")}
          className="cursor-pointer"
          variant={"ghost"}
        >
          <IoClose />
        </Button>
      )}
    </div>
  );
}

export { SearchBar };
