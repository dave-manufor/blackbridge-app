import { createContext, useState } from "react";

interface TransferListContextType {
  search: string;
  setSearch: (value: string) => void;
  page?: number;
  setPage: (value: number) => void;
  limit?: number;
  setLimit: (value: number) => void;
}
const TransferListContext = createContext<TransferListContextType | undefined>(
  undefined
);

export const TransferListProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  return (
    <TransferListContext.Provider
      value={{ search, setSearch, page, setPage, limit, setLimit }}
    >
      {children}
    </TransferListContext.Provider>
  );
};

export default TransferListContext;
