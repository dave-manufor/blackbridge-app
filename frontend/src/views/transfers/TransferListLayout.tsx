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
    <div className="flex flex-col gap-6 mx-auto pb-10 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="overflow-x-auto pb-2 md:pb-0">
          <NavigationTabs className="w-full">
            <NavigationTabsTrigger to="/transfers">All</NavigationTabsTrigger>
            <NavigationTabsTrigger to="/transfers/sent">
              Sent
            </NavigationTabsTrigger>
            <NavigationTabsTrigger to="/transfers/received">
              Received
            </NavigationTabsTrigger>
            <NavigationTabsTrigger to="/transfers/links">
              Links
            </NavigationTabsTrigger>
          </NavigationTabs>
        </div>
        <div className="w-full md:w-72">
          <SearchBar
            search={_search}
            setSearch={handleSearchChange}
            className="w-full"
            isLoading={isFetching > 0}
          />
        </div>
      </div>
      <Outlet />
    </div>
  );
};

export default TransferListLayout;
