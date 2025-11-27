import {
  NavigationTabs,
  NavigationTabsTrigger,
} from "@/components/ui/navigation-tabs";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";
import { Outlet } from "react-router";

const SettingsLayout = () => {
  const { setHeaderTitle } = useAppHeader();
  useEffect(() => {
    setHeaderTitle("Settings");
  }, [setHeaderTitle]);
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div className="overflow-x-auto pb-2 md:pb-0">
        <NavigationTabs className="w-full">
          <NavigationTabsTrigger to="/settings/account">
            Account
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/settings/brand">
            Brand
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/settings/billing">
            Billing
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/settings/notifications">
            Notifications
          </NavigationTabsTrigger>
        </NavigationTabs>
      </div>
      <Outlet />
    </div>
  );
};

export default SettingsLayout;
