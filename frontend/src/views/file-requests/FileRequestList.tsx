import React, { useEffect } from "react";
import { useFileRequests } from "../../hooks/queries/fileRequest";
import FileRequestCard from "../../components/features/file-requests/FileRequestCard";
import { useNavigate } from "react-router";
import GridSection from "../../components/ui/GridSection";
import { Button } from "../../components/ui/button";
import GenericErrorState from "@/components/ui/GenericErrorState";
import FileRequestEmptyState from "@/components/features/file-requests/FileRequestEmptyState";
import useAppHeader from "@/hooks/context/useAppHeader";

const FileRequestList: React.FC = () => {
  const { setHeaderTitle } = useAppHeader();
  const { data, isLoading, error } = useFileRequests();
  const navigate = useNavigate();

  useEffect(() => {
    setHeaderTitle(`File Requests`);
  }, [setHeaderTitle]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-16">
        <h1 className="text-3xl font-bold tracking-tight">File Requests</h1>
        <Button
          variant="default"
          size="lg"
          onClick={() => navigate("/requests/create")}
        >
          Send New Request
        </Button>
      </div>
      {isLoading && <div className="text-center py-12 text-lg">Loading...</div>}
      {error && <GenericErrorState className="w-full col-span-full" />}
      {!isLoading && !error && (
        <GridSection>
          {data?.data.length === 0 ? (
            <FileRequestEmptyState className="w-full col-span-full" />
          ) : (
            data?.data.map((request) => (
              <FileRequestCard
                request={request}
                onClick={() => navigate(`/requests/${request.id}`)}
                className="col-span-3 sm:col-span-6 md:col-span-4 lg:col-span-3"
              />
            ))
          )}
        </GridSection>
      )}
    </div>
  );
};

export default FileRequestList;
