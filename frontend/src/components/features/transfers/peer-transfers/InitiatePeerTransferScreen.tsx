import {
  Form,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import styles from "./InitiatePeerTransferScreen.module.css";
import GridSection from "@/components/ui/GridSection";
import {
  StepActionButton,
  Steps,
  StepsContent,
  StepsIndicators,
} from "@/components/ui/steps";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect, useState } from "react";
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
import useDebounceCallback from "@/hooks/utils/useDebounceCallback";
import { useSearchUsersByEmail } from "@/hooks/queries";
import Skeleton from "@mui/material/Skeleton";
import { useInitiateP2PSessionMutation } from "@/hooks/mutations";
import { InitiateP2PSessionResponse } from "@/api/services/transferService";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import toast from "react-hot-toast";
import { getPublicKeys } from "@/api/services/userService";
import { useAuthStore } from "@/stores/authStore";
import { devOnly } from "@/utils/dev";

const InitiatePeerTransferScreen = ({
  setFiles,
  onComplete,
}: {
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onComplete: (data: InitiateP2PSessionResponse) => void;
}) => {
  const cryptoBridge = CryptoBridge.getInstance();
  const primaryKeys = useAuthStore((state) => state.primaryKeys);
  const { setHeaderTitle } = useAppHeader();
  const [emailSearch, setEmailSearch] = useState("");
  const debouncedEmailSearch = useDebounceCallback(
    (value: string) => setEmailSearch(value),
    300
  );
  const {
    data: emailResults,
    isLoading: isEmailLoading,
    isSuccess: isEmailSearchSuccess,
  } = useSearchUsersByEmail({ query: emailSearch });
  const { mutate: initiateP2PSession } = useInitiateP2PSessionMutation();

  const form = useForm({
    resolver: zodResolver(p2pTransferSchema),
    defaultValues: {
      email: "",
      description: "",
      files: [],
    },
  });

  const handleFileChange = (fileList: FileList) => {
    if (fileList.length === 0) return;

    setFiles((prev) => [...prev, ...Array.from(fileList)]);

    const newFiles = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      content_type: file.type,
    }));
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

  const handleSubmit = async (data: z.infer<typeof p2pTransferSchema>) => {
    // Return a boolean promise for step action button to handle loading state
    return new Promise<boolean>((resolve, reject) => {
      Promise.all([
        cryptoBridge.generateSessionKey(),
        getPublicKeys([data.email]),
      ])
        .then(async ([sessionKey, publicKeys]) => {
          if (publicKeys.length === 0) {
            reject(new Error("No public key found for recipient"));
            toast.error("Failed to initiate P2P session. Please try again.");
            return;
          }
          const recipientPublicKey = publicKeys[0].public_key;
          const [owner_key, recipient_key] =
            await cryptoBridge.encryptSessionKeys(sessionKey, {
              publicKeys: [primaryKeys!.public_key, recipientPublicKey],
              outputFormat: "armored",
            });
          initiateP2PSession(
            {
              recipient_identifier: data.email,
              description: data.description,
              files: data.files,
              owner_key,
              recipient_key,
            },
            {
              onSuccess: (data) => {
                resolve(true);
                console.log("P2P Session initiated:", data);
                onComplete(data);
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        })
        .catch((error) => {
          reject(error);
          devOnly(() => console.error(error));
          toast.error("Failed to initiate P2P session. Please try again.");
        });
    });
  };

  const handleEmailChange = (value: string) => {
    form.setValue("email", value);
  };

  const shouldRenderEmails =
    emailSearch && isEmailSearchSuccess && emailResults?.length > 0;

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
                            handleEmailChange(value ?? "")
                          }
                        >
                          <ComboBoxInput placeholder="Search for a user..." />
                          <ComboBoxOptions
                            searchable
                            shouldFilter={false}
                            isLoading={isEmailLoading}
                            searchPlaceholder="Type to search..."
                            onSearchChange={(value) =>
                              debouncedEmailSearch(value)
                            }
                            emptyElement="No user found"
                          >
                            {!emailSearch && (
                              <ComboBoxOption key={"loading"} value="" disabled>
                                <Skeleton width="75%" height={24} />
                              </ComboBoxOption>
                            )}
                            {shouldRenderEmails &&
                              emailResults.map((user) => (
                                <ComboBoxOption
                                  key={user.id}
                                  value={user.email}
                                >
                                  {user.email}
                                </ComboBoxOption>
                              ))}
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
                        className="my-2"
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

export default InitiatePeerTransferScreen;
