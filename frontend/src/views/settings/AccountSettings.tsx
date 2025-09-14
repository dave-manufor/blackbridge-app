import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/overlay/modal";
import { StyledAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import GridSection from "@/components/ui/GridSection";
import { Input } from "@/components/ui/input";
import { changePasswordSchema } from "@/lib/validators";
import { useAuthStore } from "@/stores/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import FormControl from "@mui/material/FormControl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { MdOutlinePassword } from "react-icons/md";
import { z } from "zod";

const AccountSettings = () => {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const handleOpenPasswordModal = () => {
    setShowChangePasswordModal(true);
  };
  const handleClosePasswordModal = () => {
    setShowChangePasswordModal(false);
  };
  return (
    <>
      <GridSection>
        <div className="col-span-full flex flex-col items-center">
          <div className="flex items-center gap-4 mb-8 max-sm:flex-col sm:gap-2">
            <StyledAvatar
              className="size-18"
              profile_url={user?.profile_picture || undefined}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button>Upload Image</Button>
                <Button variant="secondary">Remove Image</Button>
              </div>
              <span className="text-[14px] text-neutral-400 font-light">
                We support JPEG and PNG under 2MB
              </span>
            </div>
          </div>
          <div className=" flex gap-12">
            <div className="flex flex-col gap-1 text-center max-sm:text-left">
              <h4>Email</h4>
              <span className="text-[14px] text-neutral-400">
                {user?.email}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-center max-sm:text-left">
              <h4>Current Plan</h4>
              <span className="text-[14px] text-neutral-400">
                {"Free Plan"}
              </span>
            </div>
          </div>
        </div>
      </GridSection>
      <GridSection>
        <div className="col-span-full">
          <hr className="h-[1px] text-neutral-200 w-full" />
        </div>
      </GridSection>
      <GridSection>
        <ActionCard
          title="Change Password"
          description="If you suspect your account has been compromised, update your password immediately to protect your files and data."
          actionLabel="Change Password"
          onAction={handleOpenPasswordModal}
        />
        <ActionCard
          title="Delete Account"
          description="This action is irreversible. Deleting your account will permanently remove all your data, including files, settings, and preferences."
          actionLabel="Delete Account"
          isDestructive
          disabled
          onAction={() => {}}
        />
      </GridSection>
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={handleClosePasswordModal}
      />
    </>
  );
};

const ActionCard = ({
  title,
  description,
  actionLabel,
  isDestructive = false,
  disabled = false,
  onAction,
}: {
  title: string;
  description: string;
  isDestructive?: boolean;
  disabled?: boolean;
  actionLabel: string;
  onAction: () => void;
}) => {
  return (
    <div className="col-span-full max-w-[652px] mx-auto border border-neutral-200 rounded-lg overflow-hidden">
      <div className="w-full flex flex-col gap-4 p-4 border-b border-neutral-200">
        <span className="text-xl font-semibold mb-2">{title}</span>
        <p className="text-[14px] text-neutral-400">{description}</p>
      </div>
      <div className="flex justify-end p-2">
        <Button
          disabled={disabled}
          variant={isDestructive ? "destructive" : "default"}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
    resolver: zodResolver(changePasswordSchema),
  });
  const onSubmit = (data: z.infer<typeof changePasswordSchema>) => {};
  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 flex items-center justify-center bg-neutral-200 rounded-sm">
              <MdOutlinePassword />
            </div>
            Change Password
          </div>
        </ModalHeader>
        <ModalBody>
          <Form {...form}>
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Current Password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="New Password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Confirm Password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ModalClose />
          <Button onClick={form.handleSubmit(onSubmit)}>Change Password</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AccountSettings;
