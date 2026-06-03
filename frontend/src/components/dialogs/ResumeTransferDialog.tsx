import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { P2PLatestSession } from "@/lib/storage/p2pStorageKeys";
import { formatDistanceToNow } from "date-fns";
import { FileIcon, Clock, User } from "lucide-react";
import { useState } from "react";

interface ResumeTransferDialogProps {
  open: boolean;
  session: P2PLatestSession;
  onResume: () => void;
  onStartNew: (dontAskAgain: boolean) => void;
}

export function ResumeTransferDialog({
  open,
  session,
  onResume,
  onStartNew,
}: ResumeTransferDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Calculate total size
  const totalSize = session.files.reduce((acc, f) => acc + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Resume Previous Transfer?</AlertDialogTitle>
          <AlertDialogDescription>
            You have an unfinished transfer from{" "}
            {formatDistanceToNow(session.lastActivity, { addSuffix: true })}.
            Would you like to resume it?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <User className="w-4 h-4" />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {session.recipient.email}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <FileIcon className="w-4 h-4" />
            <span>
              {session.files.length} files ({formatSize(totalSize)})
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Clock className="w-4 h-4" />
            <span>
              Started {new Date(session.startedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 mb-2">Files:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {session.files.map((file, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-neutral-400">{formatSize(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="dont-ask" 
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
          />
          <Label htmlFor="dont-ask" className="text-sm text-neutral-500 font-normal cursor-pointer">
            Don't ask me again for this transfer
          </Label>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={() => onStartNew(dontAskAgain)}
            className="mt-0"
          >
            Start New Transfer
          </AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>
            Resume Transfer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
