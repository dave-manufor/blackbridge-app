import { cn } from "@/lib/utils";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { motion } from "framer-motion";

interface NavigationTabsContextType {
  activeTab: HTMLAnchorElement | null;
  setActiveTab: (tab: HTMLAnchorElement | null) => void;
}

const NavigationTabsContext = createContext<
  NavigationTabsContextType | undefined
>(undefined);

const NavigationTabsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeTab, setActiveTab] = useState<HTMLAnchorElement | null>(null);
  return (
    <NavigationTabsContext.Provider
      value={{
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </NavigationTabsContext.Provider>
  );
};

const NavigationTabs = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <NavigationTabsProvider>
      <NavigationTabsList className={className}>{children}</NavigationTabsList>
    </NavigationTabsProvider>
  );
};

const NavigationTabsList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const context = useContext(NavigationTabsContext);
  if (!context) {
    throw new Error("NavigationTabsList must be used within a NavigationTabs");
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeTab } = context;
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center relative border-b border-neutral-200",
        className
      )}
    >
      {children}
      <motion.div
        className="absolute top-full -translate-y-1/2 h-0.5 bg-neutral-800"
        animate={{
          width: activeTab ? `${activeTab.offsetWidth}px` : 0,
          transform: activeTab
            ? `translateX(${activeTab.offsetLeft}px)`
            : "none",
        }}
      />
    </div>
  );
};

const NavigationTabsTrigger = ({
  children,
  onClick,
  to,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) => {
  const [isActive, setIsActive] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const context = useContext(NavigationTabsContext);
  if (!context) {
    throw new Error(
      "NavigationTabsTrigger must be used within a NavigationTabs Component"
    );
  }
  const { pathname } = useLocation();
  const { setActiveTab } = context;

  useEffect(() => {
    if (triggerRef.current && pathname === to) {
      setActiveTab(triggerRef.current);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [pathname, to, setActiveTab]);

  return (
    <NavLink
      ref={triggerRef}
      className={cn(
        "px-10 py-3 flex items-center justify-center text-lg font-normal",
        {
          "text-neutral-500 hover:bg-neutral-50": !isActive,
          "text-neutral-800 font-semibold": isActive,
        }
      )}
      onClick={onClick}
      to={to ? to : "#"}
    >
      {children}
    </NavLink>
  );
};

export { NavigationTabs, NavigationTabsTrigger };
