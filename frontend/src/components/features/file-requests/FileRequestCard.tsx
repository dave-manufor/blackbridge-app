import React from "react";
import { FileRequestDetailsResponse } from "../../../types/fileRequest";
import {
  Card,
} from "../../ui/card";
import { Badge } from "../../ui/badge";
import { LuUser, LuMail, LuFile } from "react-icons/lu";
import { cn } from "@/lib/utils";

interface FileRequestCardProps {
  request: FileRequestDetailsResponse;
  onClick?: () => void;
  className?: string;
}

const FileRequestCard: React.FC<FileRequestCardProps> = ({
  request,
  onClick,
  className,
}) => {
  return (
    <Card
      className={cn(
        "h-full flex flex-col justify-between hover:shadow-md transition-all cursor-pointer p-5 group",
        className
      )}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 overflow-hidden">
            <h3 className="text-lg font-semibold text-neutral-900 truncate">
              {request.title || "Untitled Request"}
            </h3>
            {request.description && (
              <p className="text-sm text-neutral-500 line-clamp-2">
                {request.description}
              </p>
            )}
          </div>
          <div className="shrink-0">
            {request.fulfilled ? (
              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                Fulfilled
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200">
                Pending
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <LuUser className="text-neutral-400 shrink-0" />
            <span className="truncate">From: {request.requester.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <LuMail className="text-neutral-400 shrink-0" />
            <span className="truncate">To: {request.recipient.email}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-neutral-600">
            <LuFile className="text-neutral-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {request.files.length} file{request.files.length !== 1 ? "s" : ""} requested
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FileRequestCard;
