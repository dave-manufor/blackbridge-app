import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFileRequest } from "@/hooks/queries";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
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
  const {
    register,
    control,
    handleSubmit,
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
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Send File Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Recipient's Email</Label>
                <div className="flex items-center gap-2">
                  <LuUser className="text-muted-foreground" />
                  <Input
                    {...register("recipient_identifier")}
                    placeholder="recipient@example.com"
                  />
                </div>
                {errors.recipient_identifier && (
                  <p className="text-red-500 text-sm">
                    {errors.recipient_identifier.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <div className="flex items-center gap-2">
                  <LuText className="text-muted-foreground" />
                  <Input {...register("title")} placeholder="Request Title" />
                </div>
                {errors.title && (
                  <p className="text-red-500 text-sm">{errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <div className="flex items-center gap-2">
                  <LuText className="text-muted-foreground" />
                  <Textarea
                    {...register("description")}
                    placeholder="Optional description for the request"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label>Requested Files</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <LuFile className="text-muted-foreground" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        {...register(`files.${index}.name`)}
                        placeholder="File name"
                      />
                      <Input
                        {...register(`files.${index}.description`)}
                        placeholder="Optional description"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <LuTrash2 className="text-red-500" />
                    </Button>
                  </div>
                ))}
                {errors.files && (
                  <p className="text-red-500 text-sm">{errors.files.message}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => append({ name: "", description: "" })}
                  className="flex items-center gap-2"
                >
                  <LuPlus />
                  Add another file
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={createMutation.status === "pending"}
                className="w-full"
              >
                {createMutation.status === "pending"
                  ? "Sending..."
                  : "Send Request"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
};

export default FileRequestCreate;
