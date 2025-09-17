import styles from "./DashboardView.module.css";
import { StyledFilePicker } from "@/components/ui/file-picker";
import { useUploadStore } from "@/stores/uploadStore";
import { useShallow } from "zustand/react/shallow";
import GridSection from "@/components/ui/GridSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LuMail, LuLink } from "react-icons/lu";
import { formatFileSize, prettierLinkAccessControl } from "@/utils/format";
import { defaultStyles, FileIcon } from "react-file-icon";
import { IoCloseCircleOutline } from "react-icons/io5";
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

  const handleFileChange = async (newFiles: FileList) => {
    setValue("files", [...files, ...Array.from(newFiles)]);
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
    <>
      <GridSection>
        <Card className={styles.transfer_container}>
          <div className={`${styles.transfer_files} ${styles.card}`}>
            {!isUploading && (
              <>
                {/* Mobile File Picker */}
                <div className="w-full">
                  <div className="w-full hidden max-sm:flex items-center justify-between ">
                    <div className="flex flex-col items-start">
                      <span className="text-black text-xl font-semibold">
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
                      <FaCirclePlus className="text-4xl" />
                    </StyledFilePicker>
                  </div>
                  {formErrors.files?.message && (
                    <span className="small-text !text-red-500">
                      {formErrors.files.message}
                    </span>
                  )}
                </div>

                {/* Default File Picker */}
                <motion.div
                  className={`${styles.file_picker} ${
                    files.length > 0 ? styles.shrink : ""
                  } max-sm:hidden`}
                  layout
                  transition={{
                    type: "tween",
                    visualDuration: 0.4,
                    ease: "easeOut",
                  }}
                >
                  <StyledFilePicker
                    variant="neutral"
                    onFileChange={handleFileChange}
                    draggable
                    multiple
                    className="text-center h-full"
                    error={formErrors.files?.message}
                  />
                </motion.div>
              </>
            )}

            {files.length > 0 && (
              <motion.div
                className={styles.file_list}
                initial={{
                  y: 110,
                  opacity: 0,
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                }}
                transition={{
                  type: "tween",
                  visualDuration: 0.4,
                  ease: "easeOut",
                }}
              >
                {files.map((file, index) => {
                  const extension = file.name.split(".").pop()?.toLowerCase();
                  const name = file.name.split(".").slice(0, -1).join(".");
                  const iconStyle =
                    defaultStyles[extension as keyof typeof defaultStyles];
                  return (
                    <div key={index} className={styles.file_item_wrapper}>
                      <div className={styles.file_item}>
                        <div className={styles.file_info}>
                          <div className={styles.file_icon}>
                            <FileIcon
                              extension={file.name.split(".").pop()}
                              {...iconStyle}
                            />
                          </div>
                          <div className={styles.file_details}>
                            <span className={styles.file_name}>{name}</span>
                            <span className={styles.file_meta}>
                              {file.size
                                ? formatFileSize(file.size)
                                : "Unknown size"}{" "}
                              | {extension}
                            </span>
                          </div>
                        </div>
                        {!isUploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={styles.remove_button}
                            onClick={() => handleFileRemove(index)}
                          >
                            <IoCloseCircleOutline />
                          </Button>
                        )}
                        {isUploading && getFileProgress(index) >= 100 && (
                          <FaCheckCircle className="text-green-500" />
                        )}
                      </div>
                      {isUploading && getFileProgress(index) > 0 && (
                        <Progress
                          className="h-1"
                          value={getFileProgress(index)}
                        />
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
          <div className={styles.transfer_details}>
            {isUploading ? (
              <div className="flex flex-col gap-4 items-center justify-center h-full w-full">
                <SimpleRadialChart
                  animateSpin
                  className="w-3/4 max-w-[200px]"
                  value={Math.floor(totalProgress) || 1} // Ensure at least 1% is shown when starting
                />
                <div className="flex flex-col items-center text-center gap-1">
                  <span className="text-2xl font-medium">
                    Uploading Files...
                  </span>
                  <span className="text-sm text-neutral-400">
                    Uploaded {getTotalUploadedFiles()} of {files.length} files
                  </span>
                </div>
              </div>
            ) : (
              <Tabs defaultValue={"email"}>
                <TabsList className="w-full mb-4">
                  <TabsTrigger
                    value="email"
                    disabled={isUploading}
                    className="cursor-pointer"
                    onClick={() => handleTabChange("email")}
                  >
                    <LuMail /> Email
                  </TabsTrigger>
                  <TabsTrigger
                    value="link"
                    disabled={isUploading}
                    className="cursor-pointer"
                    onClick={() => handleTabChange("link")}
                  >
                    <LuLink /> Link
                  </TabsTrigger>
                </TabsList>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className={`${styles.details_form} flex flex-col gap-4`}
                  >
                    <TabsContent value="email">
                      <FormField
                        name="recipients"
                        control={form.control}
                        render={() => (
                          <FormItem>
                            <FormLabel>Email to</FormLabel>
                            <FormControl>
                              <ChipInput
                                validation={[
                                  {
                                    test: (value) =>
                                      z.string().email().safeParse(value)
                                        .success,
                                    message: "Invalid email address",
                                  },
                                ]}
                                onChange={handleRecipientChange}
                                onError={(message) => {
                                  if (message) {
                                    setError("recipients", {
                                      type: "custom",
                                      message,
                                    });
                                  } else {
                                    clearErrors("recipients");
                                  }
                                }}
                                placeholder="Email to"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="link">
                      <FormField
                        name="password"
                        control={form.control}
                        disabled={!isPasswordProtected}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Password
                              <Checkbox
                                checked={isPasswordProtected}
                                onCheckedChange={(checked) => {
                                  setValue(
                                    "isPasswordProtected",
                                    checked as boolean
                                  );
                                  if (!checked) {
                                    setValue("isPasswordProtected", false);
                                    setValue("password", undefined);
                                    clearErrors("password");
                                  }
                                }}
                              />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <FormField
                      name="title"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Title" {...field} />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="duration"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expire in</FormLabel>
                          <div className="w-full grid grid-cols-6 gap-4">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full col-span-5">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectGroup>
                                  {Object.keys(TRANSFER_DURATIONS).map(
                                    (label) => (
                                      <SelectItem key={label} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <Popover
                              open={isPopoverOpen}
                              onOpenChange={setIsPopoverOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="col-span-1 border border-neutral-200"
                                >
                                  <FaEllipsis />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 text-neutral-600 flex flex-col p-0 overflow-hidden">
                                <Popover>
                                  <PopoverTrigger className="flex items-center justify-between w-full hover:bg-neutral-100 px-4 py-2 cursor-pointer">
                                    <span className="flex items-center gap-2">
                                      <FaRegEye /> Access Control
                                    </span>
                                    <IoIosArrowForward />
                                  </PopoverTrigger>
                                  <PopoverContent
                                    onClick={() => setIsPopoverOpen(false)}
                                    className="p-0 overflow-hidden"
                                  >
                                    <div
                                      className="flex flex-col gap-0.5 items-start text-black px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                                      onClick={() =>
                                        setValue(
                                          "access_control",
                                          LINK_TRANSFER_ACCESS_CONTROL.PUBLIC
                                        )
                                      }
                                    >
                                      <span className="flex items-center gap-2">
                                        {prettierLinkAccessControl(
                                          LINK_TRANSFER_ACCESS_CONTROL.PUBLIC
                                        )}{" "}
                                        {access_control ===
                                          LINK_TRANSFER_ACCESS_CONTROL.PUBLIC && (
                                          <FaCheck className="text-xs" />
                                        )}
                                      </span>
                                      <span className="text-xs text-neutral-400 max-w-72">
                                        This link is open to everyone. Anyone
                                        who has it can view the content without
                                        needing to log in.
                                      </span>
                                    </div>
                                    <div
                                      className="flex flex-col gap-0.5 items-start text-black px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                                      onClick={() =>
                                        setValue(
                                          "access_control",
                                          LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH
                                        )
                                      }
                                    >
                                      <span className="flex items-center gap-2">
                                        {prettierLinkAccessControl(
                                          LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH
                                        )}{" "}
                                        {access_control ===
                                          LINK_TRANSFER_ACCESS_CONTROL.REQUIRE_AUTH && (
                                          <FaCheck className="text-xs" />
                                        )}
                                      </span>
                                      <span className="text-xs text-neutral-400 max-w-72">
                                        Only people who sign in can open this
                                        link. It&apos;s a safer option if you
                                        want to keep access more limited.
                                      </span>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Popover>
                                  <PopoverTrigger className="flex items-center justify-between w-full hover:bg-neutral-100 px-4 py-2 cursor-pointer">
                                    <span className="flex items-center gap-2 ">
                                      <FaRegBell /> Notifications
                                    </span>
                                    <IoIosArrowForward />
                                  </PopoverTrigger>
                                  <PopoverContent
                                    onClick={() => setIsPopoverOpen(false)}
                                  >
                                    <div>1 day before expiration</div>
                                    <div>When viewed</div>
                                    <div>When downloaded</div>
                                  </PopoverContent>
                                </Popover>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      disabled={isUploading}
                      type="submit"
                      className="w-full"
                    >
                      Submit
                    </Button>
                  </form>
                </Form>
              </Tabs>
            )}
          </div>
        </Card>
      </GridSection>
    </>
  );
};

export default DashboardView;
