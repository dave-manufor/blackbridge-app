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
import { FaStar, FaRegCreditCard, FaRegBell } from "react-icons/fa6";
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
  IoLinkOutline,
  IoLink,
} from "react-icons/io5";
import { Link } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "../../ui/dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import useActivePath from "@/hooks/utils/useActivePath";
import { Fragment } from "react";
import { useGetUnviewedTransferCountQuery } from "@/hooks/queries";
import ProfileSummary from "@/components/ui/ProfileSummary";
import { useShallow } from "zustand/react/shallow";

interface MenuItemBase {
  label: string;
  defaultIcon: React.ComponentType;
  activeIcon: React.ComponentType;
  badge?: string | number;
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

const AppSideBar = () => {
  const { user, signOut } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      signOut: state.signOut,
    }))
  );
  const { data: unviewedTransfersCount } = useGetUnviewedTransferCountQuery();
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
        url: "/transfers",
        children: [
          {
            label: "Sent Files",
            defaultIcon: IoCaretUpCircleOutline,
            activeIcon: IoCaretUpCircle,
            url: "/transfers/sent",
          },
          {
            label: "Received Files",
            defaultIcon: IoCaretDownCircleOutline,
            activeIcon: IoCaretDownCircle,
            url: "/transfers/received",
            badge:
              unviewedTransfersCount && unviewedTransfersCount > 0
                ? unviewedTransfersCount > 99
                  ? "99+"
                  : unviewedTransfersCount
                : undefined,
          },
          {
            label: "Links",
            defaultIcon: IoLinkOutline,
            activeIcon: IoLink,
            url: "/transfers/links",
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
        onClick: signOut,
        separator: false,
      },
    ],
  };
  const { isActive } = useActivePath();
  return (
    user && (
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
                        {item.badge && (
                          <div className="ml-auto size-6 rounded-full bg-red-400 text-[10px] text-white font-medium flex items-center justify-center">
                            {item.badge}
                          </div>
                        )}
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
                                <span className="text-[14px]">
                                  {child.label}
                                </span>
                                {child.badge && (
                                  <div className="ml-auto size-5 rounded-full bg-red-400 text-[10px] text-white font-medium flex items-center justify-center">
                                    {child.badge}
                                  </div>
                                )}
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
              <ProfileSummary
                email={user.email}
                profile_url={user.profile_picture}
                subText="Free plan"
                className="w-full max-w-full"
              />
            </SidebarFooter>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="p-4">
            <ProfileSummary
              email={user.email}
              profile_url={user.profile_picture}
              subText="Free plan"
              className="mb-4 w-full max-w-full"
            />
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
    )
  );
};

export default AppSideBar;
