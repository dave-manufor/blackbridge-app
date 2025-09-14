import GridSection from "@/components/ui/GridSection";
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
    <>
      <GridSection>
        <NavigationTabs className="col-span-full">
          <NavigationTabsTrigger to="/settings/account">
            Account
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/settings/billing">
            Billing
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/settings/notifications">
            Notifications
          </NavigationTabsTrigger>
        </NavigationTabs>
      </GridSection>
      <Outlet />
    </>
  );
};

export default SettingsLayout;
