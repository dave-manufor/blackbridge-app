import { cn } from "@/lib/utils";
import ConstructionIllustration from "@assets/img/crane-construction-illustration.svg";
import { Button } from "./button";
import { useNavigate } from "react-router";
import { FaArrowLeft } from "react-icons/fa6";

const ComingSoonState = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center p-8 text-center",
        className
      )}
    >
      <img
        src={ConstructionIllustration}
        alt="No Transfers"
        className="w-48 max-w-3/4 h-48 mb-4"
      />
      <div className="flex flex-col w-128 max-w-3/4 mb-4">
        <span className="text-xl font-semibold mb-2">
          Something New is on the Way
        </span>
        <span className="text-neutral-400">
          You&apos;ve landed on a feature that&apos;s still under construction.
          We&apos;re busy behind the scenes making sure it&apos;s secure,
          polished, and ready for you. In the meantime, keep exploring the rest
          of BlackBridge—we&apos;ll notify you as soon as this feature goes
          live.
        </span>
      </div>
      <Button onClick={() => navigate(-1)}>
        <FaArrowLeft />
        Go back
      </Button>
    </div>
  );
};

export default ComingSoonState;
