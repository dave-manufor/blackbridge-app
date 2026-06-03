import { StyledFilePicker } from "@/components/ui/file-picker";
import FileCard from "@/components/ui/FileCard";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/stores/uploadStore";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LuMail, LuLink } from "react-icons/lu";
import { formatFileSize } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ChipInput, Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferSchema } from "@/lib/validators";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import {
  LINK_TRANSFER_ACCESS_CONTROL,
  MAX_TRANSFER_FILE_SIZE,
  TRANSFER_DURATIONS,
} from "@/config/constants/transfers";
import { Card } from "@/components/ui/card";
import { FaCirclePlus, FaEllipsis, FaRegBell, FaRegEye } from "react-icons/fa6";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import useInitiateTransfer from "@/hooks/mutations/useInitiateTransfer";
import toast from "react-hot-toast";
import { devOnly } from "@/utils/dev";
import { Progress } from "@/components/ui/progress";
import { SimpleRadialChart } from "@/components/charts/SimpleRadialChart";
import useAppHeader from "@hooks/context/useAppHeader";
import { useEffect, useState } from "react";
import { FaCheck } from "react-icons/fa6";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IoIosArrowForward } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router";
import AnalyticsOverview from "@/components/dashboard/AnalyticsOverview";

const DashboardView = () => {
  const navigate = useNavigate();
  const { setHeaderTitle } = useAppHeader();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { totalProgress, fileProgress } = useUploadStore(
    useShallow((state) => ({
      totalProgress: state.totalProgress,
      fileProgress: state.fileProgress,
    }))
  );
  const { mutate: initiateTransfer, isPending: isUploading } =
    useInitiateTransfer();

  const form = useForm({
    defaultValues: {
      files: [],
      title: undefined,
      description: undefined,
      duration: Object.keys(TRANSFER_DURATIONS)[0],
      recipients: [],
      isLink: false,
      isPasswordProtected: false,
      password: undefined,
      access_control: LINK_TRANSFER_ACCESS_CONTROL.PUBLIC,
    },
    mode: "onBlur",
    resolver: zodResolver(transferSchema),
  });

  const {
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors: formErrors },
  } = form;
  const [files, isPasswordProtected, access_control] = watch([
    "files",
    "isPasswordProtected",
    "access_control",
  ]);

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
    setValue("files", [...files, ...validFiles]);
  };
  const handleFileRemove = (index: number) => {
    setValue(
      "files",
      files.filter((_, i) => i !== index)
    );
  };

  const handleRecipientChange = (recipients: string[]) => {
    setValue("recipients", recipients);
  };

  const handleTabChange = (value: "link" | "email") => {
    if (value === "email") {
      setValue("isLink", false);
      setValue("isPasswordProtected", false);
      setValue("password", "");
    } else {
      setValue("isLink", true);
      setValue("recipients", []);
    }
  };

  const handleSubmit = (data: z.infer<typeof transferSchema>) => {
    devOnly(() => console.log("Submitting form", data));
    initiateTransfer(
      {
        data,
      },
      {
        onSuccess: (transferId) => {
          form.reset();
          toast(
            (t) => (
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" /> Files uploaded
                  successfully!
                </span>
                <span className="flex justify-end">
                  <Button
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate(`/transfers/${transferId}`);
                    }}
                  >
                    View Transfer
                  </Button>
                </span>
              </div>
            ),
            {
              duration: 5000,
            }
          );
        },
        onError: () => {
          toast.error(
            "Something went wrong while uploading your files. Please try again."
          );
        },
      }
    );
  };

  const getFileProgress = (fileIndex: number) => {
    return fileProgress[fileIndex] || 0;
  };

  const getTotalUploadedFiles = () => {
    return fileProgress.filter((progress) => progress >= 100).length;
  };

  useEffect(() => {
    setHeaderTitle("Dashboard");
  }, [setHeaderTitle]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <AnalyticsOverview />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Transfer Area */}
        <Card className="xl:col-span-2 p-0 overflow-hidden border-none shadow-lg bg-white rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full min-h-[500px]">
            {/* Left Side: File Picker & List */}
            <div className="p-6 bg-neutral-50 border-r border-neutral-100 flex flex-col gap-4">
              {!isUploading && (
                <>
                  {/* Mobile File Picker */}
                  <div className="w-full md:hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col items-start">
                        <span className="text-neutral-900 text-xl font-semibold">
                          {files.length > 0 ? "Add" : "Upload"} Files
                        </span>
                        <span className="text-neutral-400 text-sm">
                          Tap to select your files
                        </span>
                      </div>
                      <StyledFilePicker
                        onFileChange={handleFileChange}
                        asChild
                        multiple
                      >
                        <FaCirclePlus className="text-4xl text-primary-500" />
                      </StyledFilePicker>
                    </div>
                    {formErrors.files?.message && (
                      <span className="text-xs text-error-red-500 font-medium">
                        {formErrors.files.message}
                      </span>
                    )}
                  </div>

                  {/* Desktop File Picker */}
                  <motion.div
                    className={cn(
                      "hidden md:flex flex-col transition-all duration-300",
                      files.length > 0 ? "h-auto min-h-[150px]" : "h-full"
                    )}
                    layout
                  >
                    <StyledFilePicker
                      variant="neutral"
                      onFileChange={handleFileChange}
                      draggable
                      multiple
                      className={cn(
                        "text-center w-full border-2 border-dashed border-neutral-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50/30 transition-all",
                        files.length > 0 ? "h-auto p-4" : "h-full p-6"
                      )}
                      error={formErrors.files?.message}
                    />
                  </motion.div>
                </>
              )}

              {files.length > 0 && (
                <motion.div
                  className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px] scrollbar-thin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {files.map((file, index) => {
                    const extension = file.name.split(".").pop()?.toLowerCase() || "";
                    
                    return (
                      <div key={index} className="relative">
                        <FileCard
                          variant="form"
                          name={file.name}
                          size={file.size}
                          contentType={extension}
                          allowDownload={false}
                          onRemove={() => handleFileRemove(index)}
                          className={cn(
                            "border-neutral-100 shadow-sm hover:shadow-md transition-all",
                            isUploading && getFileProgress(index) >= 100 && "border-green-200 bg-green-50"
                          )}
                        />
                        
                        {isUploading && getFileProgress(index) > 0 && getFileProgress(index) < 100 && (
                          <Progress className="h-1 mt-1 absolute bottom-0 left-0 right-0 rounded-b-lg rounded-t-none" value={getFileProgress(index)} />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Right Side: Form & Details */}
            <div className="p-6 flex flex-col">
              {isUploading ? (
                <div className="flex flex-col gap-6 items-center justify-center h-full w-full py-10">
                  <SimpleRadialChart
                    animateSpin
                    className="w-48"
                    value={Math.floor(totalProgress) || 1}
                  />
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-2xl font-semibold text-neutral-800">
                      Uploading Files...
                    </span>
                    <span className="text-sm text-neutral-500">
                      Uploaded {getTotalUploadedFiles()} of {files.length} files
                    </span>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="email" className="h-full flex flex-col">
                  <TabsList className="w-full mb-6 bg-neutral-100/50 p-1 rounded-xl">
                    <TabsTrigger
                      value="email"
                      className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-500 transition-all"
                      onClick={() => handleTabChange("email")}
                    >
                      <LuMail className="mr-2" /> Email
                    </TabsTrigger>
                    <TabsTrigger
                      value="link"
                      className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-500 transition-all"
                      onClick={() => handleTabChange("link")}
                    >
                      <LuLink className="mr-2" /> Link
                    </TabsTrigger>
                  </TabsList>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSubmit)}
                      className="flex-1 flex flex-col gap-5"
                    >
                      <TabsContent value="email" className="mt-0">
                        <FormField
                          name="recipients"
                          control={form.control}
                          render={() => (
                            <FormItem>
                              <FormLabel className="text-neutral-600">Email to</FormLabel>
                              <FormControl>
                                <ChipInput
                                  validation={[
                                    {
                                      test: (value) => z.string().email().safeParse(value).success,
                                      message: "Invalid email address",
                                    },
                                  ]}
                                  onChange={handleRecipientChange}
                                  onError={(message) => {
                                    if (message) {
                                      setError("recipients", { type: "custom", message });
                                    } else {
                                      clearErrors("recipients");
                                    }
                                  }}
                                  placeholder="Enter email addresses..."
                                  className="bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl min-h-[48px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      <TabsContent value="link" className="mt-0">
                        <FormField
                          name="password"
                          control={form.control}
                          disabled={!isPasswordProtected}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel className="text-neutral-600">Password Protection</FormLabel>
                                <Checkbox
                                  checked={isPasswordProtected}
                                  onCheckedChange={(checked) => {
                                    setValue("isPasswordProtected", checked as boolean);
                                    if (!checked) {
                                      setValue("password", undefined);
                                      clearErrors("password");
                                    }
                                  }}
                                  className="data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
                                />
                              </div>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Set a password (optional)"
                                  {...field}
                                  className="bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      <div className="grid grid-cols-1 gap-5">
                        <FormField
                          name="title"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-neutral-600">Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Transfer Title" 
                                  {...field} 
                                  className="bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          name="description"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-neutral-600">Message</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Add a message..." 
                                  {...field} 
                                  className="bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl min-h-[100px] resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-auto pt-4 flex flex-col gap-4">
                        <div className="flex gap-3">
                          <FormField
                            name="duration"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-neutral-50 border-neutral-200 rounded-xl h-12">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
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
                              </FormItem>
                            )}
                          />
                          
                          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-neutral-200">
                                <FaEllipsis />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2 rounded-xl shadow-xl border-neutral-100" align="end">
                              {/* Popover content kept similar but styled */}
                              <div className="space-y-1">
                                <div className="px-3 py-2 text-sm font-medium text-neutral-900 border-b border-neutral-100 mb-1">
                                  Transfer Settings
                                </div>
                                <Popover>
                                  <PopoverTrigger className="flex items-center justify-between w-full hover:bg-neutral-50 px-3 py-2 rounded-lg cursor-pointer text-sm text-neutral-600 transition-colors">
                                    <span className="flex items-center gap-2">
                                      <FaRegEye /> Access Control
                                    </span>
                                    <IoIosArrowForward />
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-2 rounded-xl shadow-xl border-neutral-100" side="left" align="start">
                                    <div 
                                      className="p-3 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
                                      onClick={() => setValue("access_control", LINK_TRANSFER_ACCESS_CONTROL.PUBLIC)}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm text-neutral-900">Public</span>
                                        {access_control === LINK_TRANSFER_ACCESS_CONTROL.PUBLIC && <FaCheck className="text-primary-500 text-xs" />}
                                      </div>
                                      <p className="text-xs text-neutral-500 leading-relaxed">
                                        Anyone with the link can access files. No login required.
                                      </p>
                                    </div>
                                    <div 
                                      className="p-3 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
                                      onClick={() => setValue("access_control", LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH)}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm text-neutral-900">Restricted</span>
                                        {access_control === LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH && <FaCheck className="text-primary-500 text-xs" />}
                                      </div>
                                      <p className="text-xs text-neutral-500 leading-relaxed">
                                        Only authenticated users can access. Safer for sensitive files.
                                      </p>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                
                                <Popover>
                                  <PopoverTrigger className="flex items-center justify-between w-full hover:bg-neutral-50 px-3 py-2 rounded-lg cursor-pointer text-sm text-neutral-600 transition-colors">
                                    <span className="flex items-center gap-2">
                                      <FaRegBell /> Notifications
                                    </span>
                                    <IoIosArrowForward />
                                  </PopoverTrigger>
                                  <PopoverContent className="p-3 rounded-xl shadow-xl border-neutral-100 text-sm text-neutral-600" side="left" align="start">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2"><Checkbox id="n1" /> <label htmlFor="n1">1 day before expiration</label></div>
                                      <div className="flex items-center gap-2"><Checkbox id="n2" /> <label htmlFor="n2">When viewed</label></div>
                                      <div className="flex items-center gap-2"><Checkbox id="n3" /> <label htmlFor="n3">When downloaded</label></div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <Button
                          disabled={isUploading}
                          type="submit"
                          className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all"
                        >
                          {isUploading ? "Uploading..." : "Transfer Files"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Tabs>
              )}
            </div>
          </div>
        </Card>

        {/* Right Column: Recent Activity (Placeholder) */}
        <div className="hidden xl:flex flex-col gap-6">
          <Card className="flex-1 p-6 bg-white rounded-3xl border-none shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-800">Recent Activity</h3>
              <Button variant="ghost" size="sm" className="text-primary-500 hover:text-primary-600 hover:bg-primary-50">View All</Button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center shrink-0">
                    <LuLink size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-neutral-900 truncate">Project Assets {i}.zip</p>
                    <p className="text-xs text-neutral-500">Sent to alex@example.com</p>
                  </div>
                  <span className="text-xs text-neutral-400">2h ago</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
