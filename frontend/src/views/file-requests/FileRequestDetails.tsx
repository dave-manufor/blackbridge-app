import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useFileRequestDetails } from "../../hooks/queries";
import useInitiateTransfer from "../../hooks/mutations/useInitiateTransfer";
import { useUploadStore } from "../../stores/uploadStore";
import { useShallow } from "zustand/react/shallow";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "../../components/ui/select";
import { StyledFilePicker } from "../../components/ui/file-picker";
import {
  TRANSFER_DURATIONS,
  MAX_TRANSFER_FILE_SIZE,
} from "../../config/constants/transfers";
import { formatFileSize } from "../../utils/format";
import toast from "react-hot-toast";
import { SimpleRadialChart } from "@/components/charts/SimpleRadialChart";
import { FaCheckCircle } from "react-icons/fa";
import { LuFile, LuListTodo, LuUser, LuClock } from "react-icons/lu";
import { FaArrowLeft } from "react-icons/fa6";
import FileCard from "@/components/ui/FileCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FileRequestDetails: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFileRequestDetails(requestId!);
  const { mutate: initiateTransfer, isPending: isUploading } =
    useInitiateTransfer();

  const [files, setFiles] = useState<File[]>([]);
  const [duration, setDuration] = useState(Object.keys(TRANSFER_DURATIONS)[0]);

  const { totalProgress, fileProgress } = useUploadStore(
    useShallow((state) => ({
      totalProgress: state.totalProgress,
      fileProgress: state.fileProgress,
    }))
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-500">
        Loading request details...
      </div>
    );
  if (error || !data)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-error-red-500 font-medium">
          Unable to load request details
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );

  const canFulfill = !data.fulfilled;
  const transferLink = data.transfer ? `/transfers/${data.transfer.id}` : null;

  const handleFileChange = async (_newFiles: FileList) => {
    const newFiles = Array.from(_newFiles);
    const validFiles = newFiles.filter(
      (file) => file.size <= MAX_TRANSFER_FILE_SIZE
    );

    if (validFiles.length < newFiles.length) {
      toast.error(
        `Some files were not added because they exceed the maximum size of ${formatFileSize(
          MAX_TRANSFER_FILE_SIZE
        )}.`
      );
    }
    setFiles([...files, ...validFiles]);
  };

  const handleFileRemove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleFulfill = () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload.");
      return;
    }

    initiateTransfer(
      {
        data: {
          files,
          title: data.title,
          description: `Fulfillment for request: ${data.title}`,
          duration,
          recipients: [data.requester.email],
          isLink: false,
          isPasswordProtected: false,
          access_control: "public",
        },
        request_id: data.id,
      },
      {
        onSuccess: () => {
          toast.success("Fulfillment started successfully!");
          refetch();
        },
        onError: (error) => {
          toast.error(`Error starting fulfillment: ${error.message}`);
        },
      }
    );
  };

  const getFileProgress = (fileIndex: number) => {
    return fileProgress[fileIndex] || 0;
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="pl-0 hover:bg-transparent hover:text-primary-500 text-neutral-500"
        >
          <FaArrowLeft className="mr-2" /> Back to Requests
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-none shadow-lg bg-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-secondary-500" />

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                  {data.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full">
                    <LuUser className="text-primary-500" />
                    {data.requester.email}
                  </span>
                  <span className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full">
                    <LuClock className="text-neutral-400" />
                    Requested {new Date(data.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Badge
                variant={data.fulfilled ? "default" : "secondary"}
                className={cn(
                  "px-3 py-1 text-sm font-medium capitalize",
                  data.fulfilled
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-primary-100 text-primary-700 hover:bg-primary-200"
                )}
              >
                {data.fulfilled ? "Fulfilled" : "Pending"}
              </Badge>
            </div>

            <div className="space-y-8">
              <div>
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 block">
                  Description
                </Label>
                <p className="text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  {data.description || "No description provided."}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                  <LuListTodo /> Requested Files
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {data.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:border-primary-200 transition-colors shadow-sm"
                    >
                      <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg shrink-0">
                        <LuFile className="text-xl" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {file.name}
                        </div>
                        {file.description && (
                          <div className="text-sm text-neutral-500 mt-1">
                            {file.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Fulfillment Action */}
        <div className="lg:col-span-1">
          <Card className="p-6 border-none shadow-lg bg-white rounded-3xl sticky top-6">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">
              {data.fulfilled
                ? "Fulfillment Status"
                : !data.is_recipient
                ? "Request Status"
                : "Upload Files"}
            </h2>

            {data.fulfilled ? (
              <div className="flex flex-col items-center justify-center text-center gap-6 py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-4xl text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Request Complete
                  </h3>
                  <p className="text-neutral-500 text-sm">
                    This request has been fulfilled.
                  </p>
                </div>
                {transferLink && (
                  <Button
                    onClick={() => navigate(transferLink)}
                    className="w-full rounded-xl h-12 text-base"
                  >
                    View Transfer
                  </Button>
                )}
              </div>
            ) : !data.is_recipient ? (
              <div className="flex flex-col items-center justify-center text-center gap-6 py-8">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center">
                  <LuClock className="text-4xl text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Request Pending
                  </h3>
                  <p className="text-neutral-500 text-sm px-4">
                    Waiting for{" "}
                    <span className="font-medium text-neutral-900">
                      {data.recipient.email}
                    </span>{" "}
                    to upload files.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {isUploading ? (
                  <div className="flex flex-col gap-6 items-center justify-center py-8">
                    <SimpleRadialChart
                      animateSpin
                      className="w-32"
                      value={Math.floor(totalProgress) || 1}
                    />
                    <div className="text-center">
                      <p className="font-semibold text-neutral-900 mb-1">
                        Uploading Files...
                      </p>
                      <p className="text-sm text-neutral-500">
                        {fileProgress.filter((p) => p >= 100).length} of{" "}
                        {files.length} completed
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <StyledFilePicker
                      multiple
                      onFileChange={handleFileChange}
                      className="w-full border-dashed border-2 border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all rounded-xl h-32"
                    />

                    {files.length > 0 && (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                        <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Selected Files ({files.length})
                        </Label>
                        {files.map((file, index) => (
                          <div key={index} className="relative">
                            <FileCard
                              variant="form"
                              onRemove={() => handleFileRemove(index)}
                              name={file.name}
                              size={file.size}
                              contentType={
                                file.type ||
                                file.name.split(".").pop() ||
                                "unknown"
                              }
                              allowDownload={false}
                              className="border-neutral-200 shadow-sm"
                            />
                            {getFileProgress(index) > 0 && (
                              <Progress
                                className="h-1 mt-1 absolute bottom-0 left-0 right-0 rounded-b-lg rounded-t-none"
                                value={getFileProgress(index)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 pt-4 border-t border-neutral-100">
                      <Label className="text-sm font-medium text-neutral-700">
                        Expiration
                      </Label>
                      <Select onValueChange={setDuration} value={duration}>
                        <SelectTrigger className="w-full h-11 rounded-xl bg-neutral-50 border-neutral-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Object.keys(TRANSFER_DURATIONS).map((label) => (
                              <SelectItem key={label} value={label}>
                                Expires in {label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleFulfill}
                      className="w-full h-12 text-base rounded-xl shadow-lg shadow-primary-500/20"
                      disabled={files.length === 0}
                    >
                      Send Files
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FileRequestDetails;
