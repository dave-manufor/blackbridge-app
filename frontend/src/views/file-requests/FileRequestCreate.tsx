import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFileRequest, useSearchUsersByEmail } from "@/hooks/queries";
import {
  Card,
} from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { LuUser, LuText, LuFile, LuPlus, LuTrash2 } from "react-icons/lu";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { FaArrowLeft } from "react-icons/fa6";
import useAppHeader from "@/hooks/context/useAppHeader";
import { ComboBox,  ComboBoxInput, ComboBoxOptions, ComboBoxOption } from "@/components/ui/combo-box";
import useDebounceCallback from "@/hooks/utils/useDebounceCallback";

const fileRequestSchema = z.object({
  recipient_identifier: z.string().email(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  files: z
    .array(
      z.object({
        name: z.string().min(1, "File name is required"),
        description: z.string().optional(),
      })
    )
    .min(1, "At least one file is required"),
});

type FileRequestFormValues = z.infer<typeof fileRequestSchema>;

const FileRequestCreate: React.FC = () => {
  const navigate = useNavigate();
  const { setHeaderTitle } = useAppHeader();
  const createMutation = useCreateFileRequest();
  const [emailSearch, setEmailSearch] = useState("");
  const [debouncedEmailSearch, setDebouncedEmailSearch] = useState("");
  
  const debouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedEmailSearch(value);
  }, 300);
  
  const { data: emailSuggestions, isLoading: isLoadingEmails } = useSearchUsersByEmail({ query: debouncedEmailSearch });
  
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FileRequestFormValues>({
    resolver: zodResolver(fileRequestSchema),
    defaultValues: {
      files: [{ name: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "files",
  });

  const onSubmit = (data: FileRequestFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("File request sent successfully!");
        navigate("/requests");
      },
      onError: (error) => {
        toast.error(`Error sending request: ${error.message}`);
      },
    });
  };

  useEffect(() => {
    setHeaderTitle(`File Requests`);
  }, [setHeaderTitle]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 cursor-pointer w-fit" onClick={() => navigate(-1)}>
        <FaArrowLeft />
        <span>Back to Requests</span>
      </div>
      
      <Card className="p-8 border-none shadow-lg bg-white rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-secondary-500" />
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Send File Request</h2>
              <p className="text-neutral-500">Request files from anyone, even if they don't have an account.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Recipient's Email</Label>
                <div className="relative">
                  <LuUser className="absolute left-3 top-3.5 text-neutral-400 z-10" />
                  <ComboBox
                    onValueChange={(value) => setValue("recipient_identifier", value || "")}
                  >
                    <ComboBoxInput
                      placeholder="recipient@example.com"
                      className="pl-10 h-12 rounded-xl bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100"
                    />
                    <ComboBoxOptions
                      searchable
                      searchPlaceholder="Search emails..."
                      onSearchChange={(value) => {
                        setEmailSearch(value);
                        debouncedSearch(value);
                      }}
                      isLoading={isLoadingEmails}
                      emptyElement={<div className="text-sm text-neutral-500 py-2 px-3">No users found</div>}
                    >
                      {emailSuggestions?.map((user) => (
                        <ComboBoxOption key={user.email} value={user.email}>
                          <div className="flex items-center gap-2">
                            <LuUser className="text-neutral-400" />
                            <span>{user.email}</span>
                          </div>
                        </ComboBoxOption>
                      ))}
                    </ComboBoxOptions>
                  </ComboBox>
                </div>
                {errors.recipient_identifier && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.recipient_identifier.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Title</Label>
                <div className="relative">
                  <LuText className="absolute left-3 top-3.5 text-neutral-400" />
                  <Input 
                    {...register("title")} 
                    placeholder="Request Title" 
                    className="pl-10 h-12 rounded-xl bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100" 
                  />
                </div>
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Description</Label>
                <Textarea
                  {...register("description")}
                  placeholder="Optional description for the request"
                  className="min-h-[120px] rounded-xl bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 resize-none p-4"
                />
              </div>

              <div className="space-y-4 pt-6 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-neutral-900">Requested Files</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", description: "" })}
                    className="flex items-center gap-2 rounded-lg border-neutral-200 hover:bg-neutral-50"
                  >
                    <LuPlus className="size-4" />
                    Add File
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-primary-200 transition-colors group">
                      <div className="p-2 bg-white rounded-lg border border-neutral-100 text-neutral-400 mt-1">
                        <LuFile className="size-5" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          {...register(`files.${index}.name`)}
                          placeholder="File name (e.g. Project Proposal)"
                          className="bg-white border-neutral-200 h-10 rounded-lg"
                        />
                        <Input
                          {...register(`files.${index}.description`)}
                          placeholder="Description (optional)"
                          className="bg-white border-neutral-200 h-10 rounded-lg"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <LuTrash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {errors.files && (
                  <p className="text-red-500 text-sm">{errors.files.message}</p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="rounded-xl h-12 px-6 text-neutral-500 hover:text-neutral-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.status === "pending"}
                className="rounded-xl h-12 px-8 shadow-lg shadow-primary-500/20"
              >
                {createMutation.status === "pending"
                  ? "Sending..."
                  : "Send Request"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FileRequestCreate;
