import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../../ui/sidebar";
import Logo from "@/assets/img/blackbridge-logo.svg";
import { GoHome, GoHomeFill } from "react-icons/go";
import { FaUser, FaStar, FaRegCreditCard, FaRegBell } from "react-icons/fa6";
import {
  FaRegCheckCircle,
  FaFolderOpen,
  FaRegFolderOpen,
} from "react-icons/fa";
import {
  MdLogout,
  MdDashboardCustomize,
  MdOutlineDashboardCustomize,
} from "react-icons/md";
import {
  IoFileTrayOutline,
  IoFileTray,
  IoCaretUpCircleOutline,
  IoCaretUpCircle,
  IoCaretDownCircleOutline,
  IoCaretDownCircle,
} from "react-icons/io5";
import { Link } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "../../ui/dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import useActivePath from "@/hooks/utils/useActivePath";
import { Fragment } from "react";

interface MenuItemBase {
  label: string;
  defaultIcon: React.ComponentType;
  activeIcon: React.ComponentType;
  children?: MenuItem[];
}

interface MenuItem extends MenuItemBase {
  url: string;
}

type FooterItem =
  | (MenuItemBase & {
      isAction: true;
      onClick: () => void;
      separator: boolean;
    })
  | (MenuItemBase & {
      isAction: false;
      url: string;
      separator: boolean;
    });

const items: {
  main: MenuItem[];
  footer: FooterItem[];
} = {
  main: [
    {
      label: "Dashboard",
      defaultIcon: GoHome,
      activeIcon: GoHomeFill,
      url: "/",
    },
    {
      label: "Transfer History",
      defaultIcon: FaRegFolderOpen,
      activeIcon: FaFolderOpen,
      url: "/history",
      children: [
        {
          label: "Sent Files",
          defaultIcon: IoCaretUpCircleOutline,
          activeIcon: IoCaretUpCircle,
          url: "/history/sent",
        },
        {
          label: "Received Files",
          defaultIcon: IoCaretDownCircleOutline,
          activeIcon: IoCaretDownCircle,
          url: "/history/received",
        },
        // {
        //   label: "Deleted Files",
        //   defaultIcon: FaRegCircleXmark,
        //   activeIcon: FaCircleXmark,
        //   url: "/history/deleted",
        // },
      ],
    },
    {
      label: "File Requests",
      defaultIcon: IoFileTrayOutline,
      activeIcon: IoFileTray,
      url: "/requests",
    },
    {
      label: "Branding Settings",
      defaultIcon: MdOutlineDashboardCustomize,
      activeIcon: MdDashboardCustomize,
      url: "/branding",
    },
  ],
  footer: [
    {
      label: "Upgrade plan",
      defaultIcon: FaStar,
      activeIcon: FaStar,
      isAction: false,
      url: "/",
      separator: true,
    },
    {
      label: "My Account",
      defaultIcon: FaRegCheckCircle,
      activeIcon: FaRegCheckCircle,
      isAction: false,
      url: "/",
      separator: false,
    },
    {
      label: "Billing",
      defaultIcon: FaRegCreditCard,
      activeIcon: FaRegCreditCard,
      isAction: false,
      url: "/",
      separator: false,
    },
    {
      label: "Notifications",
      defaultIcon: FaRegBell,
      activeIcon: FaRegBell,
      isAction: false,
      url: "/",
      separator: true,
    },
    {
      label: "Log out",
      defaultIcon: MdLogout,
      activeIcon: MdLogout,
      isAction: true,
      onClick: () => useAuthStore.getState().signOut(),
      separator: false,
    },
  ],
};

const AppSideBar = () => {
  const { isActive } = useActivePath();
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <img
          src={Logo}
          alt="Blackbridge Logo"
          className="max-w-[70%] h-auto mb-4"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.main.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    className="text-neutral-400"
                    isActive={isActive(item.url)}
                  >
                    <Link to={item.url}>
                      <span className="text-[18px]">
                        {isActive(item.url) ? (
                          <item.activeIcon />
                        ) : (
                          <item.defaultIcon />
                        )}
                      </span>
                      <span className="text-[16px]">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.label}>
                          <SidebarMenuSubButton
                            asChild
                            className="text-neutral-400"
                            isActive={isActive(child.url)}
                          >
                            <Link to={child.url}>
                              <span className="text-[16px]">
                                {isActive(child.url) ? (
                                  <child.activeIcon />
                                ) : (
                                  <child.defaultIcon />
                                )}
                              </span>
                              <span className="text-[14px]">{child.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <SidebarFooter className="hover:bg-neutral-800 cursor-pointer transition-colors duration-200">
            <ProfileSummary />
          </SidebarFooter>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" className="p-4">
          <ProfileSummary className="mb-4" />
          <DropdownMenuSeparator />
          {items.footer.map((item) => (
            <Fragment key={item.label}>
              <DropdownMenuItem
                onClick={item.isAction ? item.onClick : undefined}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <item.defaultIcon />
                  <span>{item.label}</span>
                </div>
              </DropdownMenuItem>
              {item.separator && <DropdownMenuSeparator />}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Sidebar>
  );
};

export default AppSideBar;

const ProfileSummary = ({ className }: { className?: string }) => {
  const user = useAuthStore((state) => state.user);
  return (
    <div
      className={`w-full max-w-full flex items-center ${
        className ? className : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar className="rounded-md w-10 h-10">
          <AvatarImage src={user?.profile_picture} />
          <AvatarFallback className="bg-gray-200 text-gray-600 rounded-md">
            <FaUser />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start flex-1 overflow-hidden">
          <span className="text-[14px] font-normal max-w-full truncate">
            {user?.email}
          </span>
          <span className="text-[12px] font-normal ">Free plan</span>
        </div>
      </div>
    </div>
  );
};
