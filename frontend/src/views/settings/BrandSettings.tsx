import GridSection from "@/components/ui/GridSection";
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

const BrandSettings = () => {
  const { setHeaderTitle } = useAppHeader();
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
        <GridSection>
          <div className="col-span-full">
            <h2 className="text-xl font-semibold">Branding</h2>
            <p className="text-sm text-neutral-500">
              Customize the appearance of your shared files and emails.
            </p>
          </div>
        </GridSection>

        <GridSection>
          <div className="col-span-2">
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
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/logo.png"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </GridSection>

        <GridSection>
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="secondary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </GridSection>

        <GridSection>
          <div className="col-span-full">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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
          </div>
        </GridSection>

        <GridSection>
          <div className="col-span-full flex justify-end">
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
        </GridSection>
      </form>
    </Form>
  );
};

export default BrandSettings;
