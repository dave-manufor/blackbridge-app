import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { FaUser } from "react-icons/fa6";
import { cn } from "@/lib/utils";

const ProfileSummary = ({
  profile_url,
  email,
  subText,
  className,
  onClick,
}: {
  className?: string;
  profile_url?: string;
  email: string;
  subText?: string;
  onClick?: () => void;
}) => {
  return (
    <div className={cn("flex items-center", className)} onClick={onClick}>
      <div className="flex items-center gap-2">
        <Avatar className="rounded-md w-10 h-10">
          <AvatarImage src={profile_url} />
          <AvatarFallback className="bg-gray-200 text-gray-600 rounded-md">
            <FaUser />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start flex-1 overflow-hidden">
          <span className="text-[14px] font-normal max-w-full truncate">
            {email}
          </span>
          {subText && (
            <span className="text-[12px] font-normal ">{subText}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSummary;
