import React from "react";
import { FileRequestDetailsResponse } from "../../../types/fileRequest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../ui/card";
import { Badge } from "../../ui/badge";
import { LuUser, LuMail, LuFile, LuCheck } from "react-icons/lu";
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
        "h-full flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer p-4",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-bold truncate">
          {request.title || "Untitled Request"}
        </CardTitle>
        {request.description && (
          <CardDescription className="line-clamp-2 text-base text-muted-foreground pt-1">
            {request.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-0">
        <div className="flex items-center gap-2 text-sm">
          <LuCheck className="text-muted-foreground" />
          <span className="font-semibold">Status:</span>
          <span
            className={request.fulfilled ? "text-green-600 font-semibold" : ""}
          >
            {request.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <LuUser className="text-muted-foreground" />
          <span className="font-semibold">Requester:</span>
          <span>{request.requester.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <LuMail className="text-muted-foreground" />
          <span className="font-semibold">Recipient:</span>
          <span>{request.recipient.email}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <LuFile className="text-muted-foreground mt-1" />
          <div>
            <span className="font-semibold">Files:</span>
            <p className="line-clamp-2">
              {request.files.map((f) => f.name).join(", ")}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4">
        {request.fulfilled && (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Fulfilled
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

export default FileRequestCard;
