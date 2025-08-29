import { useAuthStore } from "@/stores/authStore";
import { Outlet } from "react-router";
import { useShallow } from "zustand/react/shallow";
import LogoWhite from "@/assets/img/blackbridge-logo.svg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import ProfileSummary from "@/components/ui/ProfileSummary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoHome } from "react-icons/go";
import { MdLogout } from "react-icons/md";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaUser } from "react-icons/fa6";
import { IoMenu } from "react-icons/io5";

const PublicLayout = () => {
  const navigate = useNavigate();
  const { authenticated, user, signOut } = useAuthStore(
    useShallow((state) => ({
      authenticated: state.authenticated,
      user: state.user,
      signOut: state.signOut,
    }))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in");
  };

  return (
    <div className="w-screen">
      <header className="w-full px-6 h-22 bg-sidebar flex items-center justify-between">
        <img src={LogoWhite} alt="Blackbridge Logo" />
        {authenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="max-sm:hidden cursor-pointer">
                <ProfileSummary
                  email={user.email}
                  profile_url={user.profile_picture}
                  subText="Free plan"
                  className="text-white cursor-pointer"
                />
              </div>
              <Avatar className="rounded-md w-10 h-10 hidden max-sm:flex cursor-pointer">
                <AvatarImage src={user.profile_picture || ""} />
                <AvatarFallback className="bg-gray-200 text-gray-600 rounded-md">
                  <FaUser />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" className="p-2 mt-2 w-full">
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GoHome />
                  <span>Go to Dashboard</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleSignOut()}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MdLogout />
                  <span>Log Out</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <div className="flex items-center gap-2 max-sm:hidden">
              <Button
                onClick={() => navigate("/sign-in")}
                variant={"link"}
                className="text-white"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/sign-up")}
                variant={"default"}
                className="bg-white text-black hover:bg-neutral-200"
              >
                Create Account
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none hidden max-sm:flex">
                <IoMenu className="text-white text-3xl" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" className="p-2 mt-2 w-full">
                <DropdownMenuItem
                  onClick={() => navigate("/")}
                  className="cursor-pointer"
                >
                  <span className="text-center w-full">Sign In</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSignOut()}
                  className="cursor-pointer"
                >
                  <Button>Create Account</Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>
      <main className="w-full max-w-[1504px] mx-auto px-8 py-8 max-sm:px-6">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PublicLayout;
