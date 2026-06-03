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
  useSidebar,
} from "../../ui/sidebar";
import Logo from "@/assets/img/blackbridge-logo.svg";
import { GoHome, GoHomeFill } from "react-icons/go";
import { FaStar, FaRegCreditCard, FaRegBell } from "react-icons/fa6";
import {
  FaRegCheckCircle,
  FaFolderOpen,
  FaRegFolderOpen,
} from "react-icons/fa";
import { RiP2pFill, RiP2pLine } from "react-icons/ri";
import { MdLogout } from "react-icons/md";
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
import { Link, useNavigate } from "react-router";
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
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuItemBase {
  label: string;
  defaultIcon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toggleSidebar: _toggleSidebar } = useSidebar();
  const toggleSidebar = () => {
    if (isMobile) {
      _toggleSidebar();
    }
  };
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
        label: "Peer Transfer",
        defaultIcon: RiP2pLine,
        activeIcon: RiP2pFill,
        url: "/peer",
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
        ],
      },
      {
        label: "File Requests",
        defaultIcon: IoFileTrayOutline,
        activeIcon: IoFileTray,
        url: "/requests",
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
        url: "/settings/account",
        separator: false,
      },
      {
        label: "Billing",
        defaultIcon: FaRegCreditCard,
        activeIcon: FaRegCreditCard,
        isAction: false,
        url: "/settings/billing",
        separator: false,
      },
      {
        label: "Notifications",
        defaultIcon: FaRegBell,
        activeIcon: FaRegBell,
        isAction: false,
        url: "/settings/notifications",
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
  const { isActive, isPartiallyActive } = useActivePath();
  return (
    user && (
      <Sidebar collapsible="offcanvas" className="border-r-0 bg-sidebar">
        <SidebarHeader className="p-6 pb-2">
          <img src={Logo} alt="Blackbridge Logo" className="w-32 h-auto mb-2" />
        </SidebarHeader>
        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu onClick={toggleSidebar} className="space-y-1">
                {items.main.map((item) => {
                  const active =
                    item.url === "/" || item.children
                      ? isActive(item.url)
                      : isPartiallyActive(item.url);

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        isActive={active}
                        className={`
                          w-full justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200
                          ${
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-white/10 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }
                        `}
                      >
                        <Link to={item.url}>
                          <span className="text-xl">
                            {active ? (
                              <item.activeIcon />
                            ) : (
                              <item.defaultIcon />
                            )}
                          </span>
                          <span className="font-medium text-[15px]">
                            {item.label}
                          </span>
                          {item.badge && (
                            <div className="ml-auto size-5 rounded-full bg-error-red-500 text-[10px] text-white font-bold flex items-center justify-center shadow-sm">
                              {item.badge}
                            </div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                      {item.children && (
                        <SidebarMenuSub className="ml-4 mt-1 border-l-2 border-sidebar-border pl-2 space-y-1">
                          {item.children.map((child) => {
                            const childActive = isActive(child.url);
                            return (
                              <SidebarMenuSubItem key={child.label}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={childActive}
                                  className={`
                                    w-full justify-start gap-3 px-3 py-2 rounded-lg transition-all duration-200 overflow-visible
                                    ${
                                      childActive
                                        ? "text-sidebar-primary-foreground bg-sidebar-accent font-medium"
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                    }
                                  `}
                                >
                                  <Link to={child.url}>
                                    <span className="text-lg">
                                      {childActive ? (
                                        <child.activeIcon />
                                      ) : (
                                        <child.defaultIcon />
                                      )}
                                    </span>
                                    <span className="text-[14px]">
                                      {child.label}
                                    </span>
                                    {child.badge && (
                                      <div className="absolute -right-1 -top-1  ml-auto size-5 rounded-full bg-[var(--error-red-500)] text-[10px] text-white font-bold flex items-center justify-center">
                                        {child.badge}
                                      </div>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto px-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none w-full">
              <SidebarFooter className="p-3 rounded-2xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 border border-transparent hover:border-sidebar-border group">
                <ProfileSummary
                  email={user.email}
                  profile_url={user.profile_picture_url || undefined}
                  subText="Free plan"
                  className="w-full max-w-full"
                />
              </SidebarFooter>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "top" : "right"}
              className="w-56 p-2 rounded-xl shadow-xl border-neutral-100"
              align="end"
              sideOffset={8}
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-neutral-900">
                  My Account
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-neutral-100 my-1" />
              {items.footer.map((item) => (
                <Fragment key={item.label}>
                  <DropdownMenuItem
                    onClick={() => {
                      toggleSidebar();
                      if (item.isAction) {
                        item.onClick();
                      } else {
                        navigate(item.url);
                      }
                    }}
                    className="cursor-pointer rounded-lg focus:bg-neutral-50 focus:text-primary-500"
                  >
                    <div className="flex items-center gap-2.5 py-0.5">
                      <item.defaultIcon className="text-neutral-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </DropdownMenuItem>
                  {item.separator && (
                    <DropdownMenuSeparator className="bg-neutral-100 my-1" />
                  )}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Sidebar>
    )
  );
};

export default AppSideBar;
