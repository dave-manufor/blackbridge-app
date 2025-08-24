import GridSection from "@/components/ui/GridSection";
import {
  NavigationTabs,
  NavigationTabsTrigger,
} from "@/components/ui/navigation-tabs";
import { TransferListProvider } from "@/contexts/TransferListContext";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";
import { Outlet } from "react-router";

const TransferListLayout = () => {
  const { setHeaderTitle } = useAppHeader();

  useEffect(() => {
    setHeaderTitle("Transfer History");
  }, [setHeaderTitle]);

  return (
    <>
      <GridSection>
        <NavigationTabs className="col-span-full">
          <NavigationTabsTrigger to="/transfers">All</NavigationTabsTrigger>
          <NavigationTabsTrigger to="/transfers/sent">
            Sent
          </NavigationTabsTrigger>
          <NavigationTabsTrigger to="/transfers/received">
            Received
          </NavigationTabsTrigger>
        </NavigationTabs>
      </GridSection>
      <TransferListProvider>
        <Outlet />
      </TransferListProvider>
    </>
  );
};

export default TransferListLayout;
