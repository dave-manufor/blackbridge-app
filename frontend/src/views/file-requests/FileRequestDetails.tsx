import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useFileRequestDetails } from "../../hooks/queries";
import useInitiateTransfer from "../../hooks/mutations/useInitiateTransfer";
import { useUploadStore } from "../../stores/uploadStore";
import { useShallow } from "zustand/react/shallow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../../components/ui/card";
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
import { IoCloseCircleOutline } from "react-icons/io5";
import { defaultStyles, FileIcon } from "react-file-icon";
import toast from "react-hot-toast";
import { SimpleRadialChart } from "@/components/charts/SimpleRadialChart";
import { FaCheckCircle } from "react-icons/fa";
import { LuFile, LuListTodo, LuText, LuCalendar, LuUser } from "react-icons/lu";
import { FaArrowLeft } from "react-icons/fa6";
import FileCard from "@/components/ui/FileCard";
import { Progress } from "@/components/ui/progress";

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

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (error || !data)
    return (
      <div className="text-center py-8 text-red-500">
        Error loading request details
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
    <>
      <div className="col-span-full pb-4 mb-8 border-b border-neutral-200">
        <span
          onClick={() => navigate(-1)}
          className="flex text-sm items-center gap-2 hover:underline cursor-pointer"
        >
          <FaArrowLeft /> Back
        </span>
      </div>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <Card className="px-2 py-8 w-[480px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              File Request Details
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <LuText className="text-xl" />

              <div>
                <Label className="font-medium">Title</Label>

                <p>{data.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LuText className="text-xl" />

              <div>
                <Label className="font-medium">Description</Label>

                <p>{data.description || "No description provided."}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LuCalendar className="text-xl" />

              <div>
                <Label className="font-medium">Status</Label>

                <p>{data.fulfilled ? "Fulfilled" : "Pending"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LuUser className="text-xl" />

              <div>
                <Label className="font-medium">Requester</Label>

                <p>{data.requester.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <LuListTodo className="text-xl" />

              <div className="w-full">
                <Label className="font-medium">Requested Files</Label>

                <div className="space-y-2 mt-2">
                  {data.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 border rounded-md w-full"
                    >
                      <LuFile className="text-lg" />

                      <div>
                        <div className="font-medium">{file.name}</div>

                        {file.description && (
                          <div className="text-sm text-gray-500">
                            {file.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>

          {data.fulfilled && (
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
                <FaCheckCircle className="text-5xl text-green-500" />

                <h2 className="text-2xl font-bold">Request Fulfilled</h2>

                <p className="text-gray-500">
                  This file request has been successfully fulfilled.
                </p>

                {transferLink && (
                  <Button onClick={() => navigate(transferLink)}>
                    View Transfer
                  </Button>
                )}
              </div>
            </CardContent>
          )}

          {canFulfill && (
            <CardFooter className="flex-col items-start gap-4">
              {isUploading ? (
                <div className="flex flex-col gap-4 items-center justify-center h-full w-full my-4">
                  <SimpleRadialChart
                    animateSpin
                    className="w-3/4 max-w-[150px]"
                    value={Math.floor(totalProgress) || 1}
                  />

                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="text-xl font-medium">
                      Uploading Files...
                    </span>

                    <span className="text-sm text-neutral-400">
                      Uploaded{" "}
                      {
                        fileProgress.filter((progress) => progress >= 100)
                          .length
                      }{" "}
                      of {files.length} files
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <StyledFilePicker
                    onFileChange={handleFileChange}
                    className="my-4"
                  />

                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Files</Label>

                      {files.map((file, index) => {
                        const progress = getFileProgress(index);
                        return (
                          <>
                            <FileCard
                              variant="form"
                              onRemove={() => handleFileRemove(index)}
                              name={file.name}
                              size={file.size}
                              contentType={file.type}
                              allowDownload={false}
                              key={index}
                            />
                            {progress > 0 && (
                              <Progress className="h-1" value={progress} />
                            )}
                          </>
                        );
                      })}
                    </div>
                  )}

                  <div className="mb-4">
                    <Label className="mb-1 block">Expire in</Label>

                    <Select onValueChange={setDuration} value={duration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {Object.keys(TRANSFER_DURATIONS).map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleFulfill}
                    className="w-full"
                    disabled={files.length === 0}
                  >
                    Fulfill Request
                  </Button>
                </>
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    </>
  );
};

export default FileRequestDetails;
