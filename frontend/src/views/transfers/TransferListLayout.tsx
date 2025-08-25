import GridSection from "@/components/ui/GridSection";
import {
  NavigationTabs,
  NavigationTabsTrigger,
} from "@/components/ui/navigation-tabs";
import { SearchBar } from "@/components/ui/search";
import useAppHeader from "@/hooks/context/useAppHeader";
import useTransferListContext from "@/hooks/context/useTransferListContext";
import { queryKeys } from "@/hooks/queries";
import useDebounceCallback from "@/hooks/utils/useDebounceCallback";
import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Outlet } from "react-router";

const TransferListLayout = () => {
  const { setHeaderTitle } = useAppHeader();
  const [_search, _setSearch] = useState("");
  const { setSearch } = useTransferListContext();
  const isFetching = useIsFetching({ queryKey: queryKeys.transfers.all });
  const debouncedSearch = useDebounceCallback((value: string) => {
    setSearch(value);
  }, 300);

  const handleSearchChange = (value: string) => {
    _setSearch(value);
    debouncedSearch(value);
  };

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
      <GridSection>
        <SearchBar
          search={_search}
          setSearch={handleSearchChange}
          className="col-span-full"
          isLoading={isFetching > 0}
        />
      </GridSection>
      <Outlet />
    </>
  );
};

export default TransferListLayout;
