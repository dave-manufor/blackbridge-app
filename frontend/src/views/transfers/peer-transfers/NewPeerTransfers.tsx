import {
  Form,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import styles from "./NewPeerTransfers.module.css";
import GridSection from "@/components/ui/GridSection";
import {
  StepActionButton,
  Steps,
  StepsContent,
  StepsIndicators,
} from "@/components/ui/steps";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { FaArrowRight } from "react-icons/fa6";
import { StyledFilePicker } from "@/components/ui/file-picker";
import {
  ComboBox,
  ComboBoxInput,
  ComboBoxOption,
  ComboBoxOptions,
} from "@/components/ui/combo-box";
import FileCard from "@/components/ui/FileCard";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { p2pTransferSchema } from "@/lib/validators";
import { z } from "zod";
import { devOnly } from "@/utils/dev";

const NewPeerTransfer = () => {
  const { setHeaderTitle } = useAppHeader();

  const form = useForm({
    resolver: zodResolver(p2pTransferSchema),
    defaultValues: {
      email: "",
      description: "",
      files: [],
    },
  });

  const handleFileChange = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      content_type: file.type,
    }));
    devOnly(() => [...form.getValues("files"), ...newFiles]);
    form.setValue("files", [...form.getValues("files"), ...newFiles], {
      shouldValidate: true,
    });
  };

  const handleFileRemove = (index: number) => {
    const filteredFiles = form
      .getValues("files")
      .filter((_, i) => i !== index) as z.infer<
      typeof p2pTransferSchema
    >["files"];
    form.setValue("files", filteredFiles, { shouldValidate: true });
  };

  const handleStepCheck = async (stepNumber: number) => {
    switch (stepNumber) {
      case 0:
        return (
          (await form.trigger("email")) && (await form.trigger("description"))
        );
      case 1:
        return await form.trigger("files");
      default:
        return Promise.resolve(true);
    }
  };

  const handleSubmit = (data: z.infer<typeof p2pTransferSchema>) => {
    console.log("Form submitted", data);
    toast.success("Form submitted");
  };

  useEffect(() => {
    setHeaderTitle("Peer Transfer");
  }, [setHeaderTitle]);

  return (
    <GridSection>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className={styles.transfer_form}
        >
          <Steps className={styles.steps}>
            <StepsIndicators />
            <StepsContent stepNumber={0} className={styles.step}>
              <div className={styles.step_header}>
                <span className={styles.step_number}>1</span>
                <span className={styles.step_title}>
                  Who are you sending files to?
                </span>
                <span className={styles.step_description}>
                  Enter the recipient&apos;s email address. We&apos;ll create a
                  secure, encrypted transfer session just for the two of you.
                </span>
              </div>
              <div className={styles.step_body}>
                <FormField
                  name="email"
                  control={form.control}
                  render={() => (
                    <FormItem className={styles.step_input}>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <ComboBox
                          initialValue={form.getValues("email")}
                          onValueChange={(value) =>
                            form.setValue("email", value ?? "")
                          }
                        >
                          <ComboBoxInput placeholder="Search for a user..." />
                          <ComboBoxOptions
                            searchable
                            isSearching={true}
                            searchPlaceholder="Type to search..."
                            onSearchChange={(value) => console.log(value)}
                            emptyLabel="No users found."
                          >
                            <ComboBoxOption value="johndoe@example.com">
                              John Doe
                            </ComboBoxOption>
                            <ComboBoxOption value="janedoe@example.com">
                              Jane Doe
                            </ComboBoxOption>
                          </ComboBoxOptions>
                        </ComboBox>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className={styles.step_input}>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add a message (optional)..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <StepActionButton
                  action={handleStepCheck}
                  className={styles.action_button}
                >
                  Select Files <FaArrowRight />
                </StepActionButton>
                <span className={styles.step_note}>
                  The recipient will receive a secure invite link to connect
                  directly with you.
                </span>
              </div>
            </StepsContent>
            <StepsContent stepNumber={1} className={styles.step}>
              <div className={styles.step_header}>
                <span className={styles.step_number}>2</span>
                <span className={styles.step_title}>Choose files to send</span>
                <span className={styles.step_description}>
                  Your files are encrypted end-to-end and sent directly to your
                  recipient.
                </span>
              </div>
              <div className={styles.step_body}>
                <div className="w-full flex flex-col gap-2">
                  <StyledFilePicker
                    onFileChange={handleFileChange}
                    multiple
                    draggable
                    variant="neutral"
                  />
                  {form.formState.errors.files?.message && (
                    <span className="small-text !text-red-500">
                      {form.formState.errors.files.message}
                    </span>
                  )}
                </div>
                {form.getValues("files").length > 0 &&
                  form
                    .getValues("files")
                    .map((file, index) => (
                      <FileCard
                        key={`${file.name}-${index}`}
                        variant="form"
                        contentType={file.content_type}
                        name={file.name}
                        size={file.size}
                        allowDownload={false}
                        onRemove={() => handleFileRemove(index)}
                      />
                    ))}
                <StepActionButton
                  type="submit"
                  action={handleStepCheck}
                  className={styles.action_button}
                >
                  Start Transfer Session <FaArrowRight />
                </StepActionButton>
              </div>
            </StepsContent>
          </Steps>
        </form>
      </Form>
    </GridSection>
  );
};

export default NewPeerTransfer;
