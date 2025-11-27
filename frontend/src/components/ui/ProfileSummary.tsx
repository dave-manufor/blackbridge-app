import { StyledAvatar } from "./avatar";
import { cn } from "@/lib/utils";

const ProfileSummary = ({
  profile_url,
  email,
  subText,
  className,
  onClick,
  dark = true,
}: {
  className?: string;
  profile_url?: string;
  email: string;
  subText?: string;
  dark?: boolean;
  onClick?: () => void;
}) => {
  return (
    <div className={cn("flex items-center", className)} onClick={onClick}>
      <div className="flex items-center gap-2 overflow-hidden">
        <StyledAvatar className="size-14" profile_url={profile_url} />  <div
          className={cn("flex flex-col items-start flex-1 overflow-hidden", {
            "text-white": !dark,
          })}
        >
          <span className="text-[14px] font-normal max-w-full truncate overflow-ellipsis">
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
