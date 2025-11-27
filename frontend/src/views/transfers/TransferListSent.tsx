import TransferListEmptyState from "@/components/features/transfers/TransferListEmptyState";
import TransferSummaryCard from "@/components/features/transfers/TransferSummaryCard";
import TransferSummaryCardSkeleton from "@/components/features/transfers/TransferSummaryCardSkeleton";
import GenericErrorState from "@/components/ui/GenericErrorState";
import { PaginationControls } from "@/components/ui/pagination";
import {
  TRANSFER_DIRECTION,
  TRANSFER_TYPES,
} from "@/config/constants/transfers";
import useTransferListContext from "@/hooks/context/useTransferListContext";
import { useGetTransfersQuery } from "@/hooks/queries";
import { usePageReducer } from "@/hooks/reducers";

const TransferListSent = () => {
  const { search, limit } = useTransferListContext();
  const { page, dispatch: pageDispatch } = usePageReducer();
  const DIRECTION = TRANSFER_DIRECTION.SENT;
  const query = {
    direction: DIRECTION,
    search,
    limit,
    page,
    type: TRANSFER_TYPES.EMAIL,
  };
  const { isPending, isError, data } = useGetTransfersQuery(query);
  return (
    <div className="flex flex-col gap-8">
      {isError && <GenericErrorState className="col-span-full" />}
      {!isPending && data?.data && data.data.length === 0 && (
        <TransferListEmptyState className="col-span-full" />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isPending &&
          Array.from({ length: limit ? Math.min(8, limit) : 8 }).map(
            (_, index) => (
              <TransferSummaryCardSkeleton
                className="w-full"
                key={index}
              />
            )
          )}
        {!isError &&
          data?.data &&
          data.data.length > 0 &&
          data.data.map((transfer) => (
            <TransferSummaryCard
              className="w-full"
              key={transfer.id}
              id={transfer.id}
              is_viewed={transfer.is_viewed}
              is_owner={transfer.is_owner}
              recommended_title={transfer.recommended_title}
              files={transfer.files}
              total_files_size_bytes={transfer.total_files_size_bytes}
              status={transfer.status}
              transfer_type={transfer.transfer_type}
            />
          ))}
      </div>

      {!isPending && !isError && data?.data && data.data.length > 0 && (
        <PaginationControls
          className="mt-4"
          currentPage={data?.pagination.page || 1}
          hasPreviousPage={data?.pagination.hasPreviousPage || false}
          hasNextPage={data?.pagination.hasNextPage || false}
          totalPages={data?.pagination.totalPages || 1}
          onPreviousPage={() => pageDispatch({ type: "PREVIOUS" })}
          onNextPage={() => pageDispatch({ type: "NEXT" })}
          onSetPage={(page) => pageDispatch({ type: "SET", payload: page })}
        />
      )}
    </div>
  );
};

export default TransferListSent;
