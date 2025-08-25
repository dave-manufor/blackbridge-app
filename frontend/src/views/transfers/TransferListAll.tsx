import TransferSummaryCard from "@/components/features/transfers/TransferSummaryCard";
import TransferSummaryCardSkeleton from "@/components/features/transfers/TransferSummaryCardSkeleton";
import GridSection from "@/components/ui/GridSection";
import { PaginationControls } from "@/components/ui/pagination";
import { TRANSFER_DIRECTION } from "@/config/constants/transfers";
import useTransferListContext from "@/hooks/context/useTransferListContext";
import { useGetTransfersQuery } from "@/hooks/queries";
import { usePageReducer } from "@/hooks/reducers";

const TransferListAll = () => {
  const { search, limit } = useTransferListContext();
  const { page, dispatch: pageDispatch } = usePageReducer();
  const DIRECTION = TRANSFER_DIRECTION.ALL;
  const { isPending, isError, data } = useGetTransfersQuery({
    direction: DIRECTION,
    search,
    limit,
    page,
  });
  return (
    <GridSection>
      {isPending &&
        Array.from({ length: limit ? Math.min(8, limit) : 8 }).map(
          (_, index) => (
            <TransferSummaryCardSkeleton className="col-span-3" key={index} />
          )
        )}
      {data?.data &&
        data.data.length > 0 &&
        data.data.map((transfer) => (
          <TransferSummaryCard
            className="col-span-3"
            key={transfer.id}
            id={transfer.id}
            is_owner={transfer.is_owner}
            recommended_title={transfer.recommended_title}
            files={transfer.files}
            total_files_size_bytes={transfer.total_files_size_bytes}
            status={transfer.status}
            transfer_type={transfer.transfer_type}
          />
        ))}
      <PaginationControls
        className="col-span-full"
        currentPage={data?.pagination.page || 1}
        hasPreviousPage={data?.pagination.hasPreviousPage || false}
        hasNextPage={data?.pagination.hasNextPage || false}
        totalPages={data?.pagination.totalPages || 1}
        onPreviousPage={() => pageDispatch({ type: "PREVIOUS" })}
        onNextPage={() => pageDispatch({ type: "NEXT" })}
        onSetPage={(page) => pageDispatch({ type: "SET", payload: page })}
      />
    </GridSection>
  );
};

export default TransferListAll;
