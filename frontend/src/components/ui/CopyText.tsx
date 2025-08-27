import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TbCopy, TbCopyCheck } from "react-icons/tb";
const CopyText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  return (
    <div
      className={cn(
        "border border-neutral-200 rounded-md grid grid-cols-[1fr_40px] items-center",
        className
      )}
    >
      <span className="truncate px-3">{text}</span>
      <div
        onClick={handleCopy}
        className="cursor-pointer size-10 text-base flex items-center justify-center border-l border-neutral-200 hover:bg-neutral-100"
      >
        {isCopied ? <TbCopyCheck /> : <TbCopy />}
      </div>
    </div>
  );
};

export default CopyText;
