import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import useAppHeader from "@/hooks/context/useAppHeader";
import { brandSettingsSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBrandSettings,
  useCreateBrandSettings,
  useUpdateBrandSettings,
} from "@/hooks/queries/brandSettings";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useUploadBrandLogo } from "@/hooks/mutations/useUploadBrandLogo";
import { useDeleteBrandLogo } from "@/hooks/mutations/useDeleteBrandLogo";
import { useUploadBrandLogoMark } from '@/hooks/mutations/useUploadBrandLogoMark';
import { useDeleteBrandLogoMark } from '@/hooks/mutations/useDeleteBrandLogoMark';

const BrandSettings = () => {
  const { setHeaderTitle } = useAppHeader();
  const uploadBrandLogo = useUploadBrandLogo();
  const deleteBrandLogo = useDeleteBrandLogo();
  const uploadBrandLogoMark = useUploadBrandLogoMark();
  const deleteBrandLogoMark = useDeleteBrandLogoMark();
  const queryClient = useQueryClient();
  const { data: brandSettings, isLoading } = useBrandSettings();
  const createBrandSettingsMutation = useCreateBrandSettings();
  const updateBrandSettingsMutation = useUpdateBrandSettings();

  const form = useForm<z.infer<typeof brandSettingsSchema>>({
    resolver: zodResolver(brandSettingsSchema),
    defaultValues: {
      name: "",
      logo: "",
      primary_color: "",
      secondary_color: "",
      enabled: false,
    },
  });

  useEffect(() => {
    setHeaderTitle("Brand Settings");
  }, [setHeaderTitle]);

  useEffect(() => {
    if (brandSettings) {
      form.reset(brandSettings);
    }
  }, [brandSettings, form]);

  const onSubmit = (values: z.infer<typeof brandSettingsSchema>) => {
    const mutation = brandSettings
      ? updateBrandSettingsMutation
      : createBrandSettingsMutation;
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(
          `Brand settings ${brandSettings ? "updated" : "created"} successfully`
        );
        queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
      },
      onError: () => {
        toast.error(
          `Failed to ${brandSettings ? "update" : "create"} brand settings`
        );
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-neutral-900">Branding</h2>
          <p className="text-sm text-neutral-500">
            Customize the appearance of your shared files and emails.
          </p>
        </div>

        <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-2">
            <div className="space-y-2">
              <FormLabel>Brand Logo <span className="text-xs text-neutral-500">(Recommended: 1200×400px)</span></FormLabel>
              <p className="text-xs text-neutral-500 mb-2">Full logo for headers and branding</p>
              <ImageUpload
                currentImageUrl={brandSettings?.logo_url}
                onUpload={async (file) => { await uploadBrandLogo.mutateAsync(file); }}
                onDelete={async () => await deleteBrandLogo.mutateAsync()}
                isUploading={uploadBrandLogo.isPending}
                isDeleting={deleteBrandLogo.isPending}
                maxSizeMB={10}
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className="space-y-2">
              <FormLabel>Logo Mark <span className="text-xs text-neutral-500">(Recommended: 512×512px)</span></FormLabel>
              <p className="text-xs text-neutral-500 mb-2">Compact icon for avatars and favicons</p>
              <ImageUpload
                currentImageUrl={brandSettings?.logo_mark_url}
                onUpload={async (file) => { await uploadBrandLogoMark.mutateAsync(file); }}
                onDelete={async () => await deleteBrandLogoMark.mutateAsync()}
                isUploading={uploadBrandLogoMark.isPending}
                isDeleting={deleteBrandLogoMark.isPending}
                maxSizeMB={5}
              />
            </div>
          </div>
          <div className="col-span-1">
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input type="color" className="w-12 h-10 p-1" {...field} />
                      <span className="text-sm text-neutral-500 uppercase">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-1">
            <FormField
              control={form.control}
              name="secondary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input type="color" className="w-12 h-10 p-1" {...field} />
                      <span className="text-sm text-neutral-500 uppercase">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Branding</FormLabel>
                  <p className="text-sm text-neutral-500">
                    Turn on or off all branding features.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isLoading ||
              createBrandSettingsMutation.isPending ||
              updateBrandSettingsMutation.isPending
            }
          >
            {(createBrandSettingsMutation.isPending ||
              updateBrandSettingsMutation.isPending) && (
              <LuLoaderCircle className="animate-spin mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BrandSettings;
