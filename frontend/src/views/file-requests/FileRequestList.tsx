import React, { useEffect } from "react";
import { useFileRequests } from "../../hooks/queries/fileRequest";
import FileRequestCard from "../../components/features/file-requests/FileRequestCard";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import GenericErrorState from "@/components/ui/GenericErrorState";
import FileRequestEmptyState from "@/components/features/file-requests/FileRequestEmptyState";
import useAppHeader from "@/hooks/context/useAppHeader";
import { LuPlus } from "react-icons/lu";

const FileRequestList: React.FC = () => {
  const { setHeaderTitle } = useAppHeader();
  const { data, isLoading, error } = useFileRequests();
  const navigate = useNavigate();

  useEffect(() => {
    setHeaderTitle(`File Requests`);
  }, [setHeaderTitle]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-end">
        {/* <h1 className="text-2xl font-bold text-neutral-900">File Requests</h1> */}
        <Button onClick={() => navigate("/requests/create")}>
          <LuPlus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-neutral-500">
          Loading requests...
        </div>
      )}

      {error && <GenericErrorState />}

      {!isLoading && !error && (
        <>
          {data?.data.length === 0 ? (
            <FileRequestEmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data?.data.map((request) => (
                <FileRequestCard
                  key={request.id}
                  request={request}
                  onClick={() => navigate(`/requests/${request.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileRequestList;
