import { cn } from "@/lib/utils";
import { IoMdClose } from "react-icons/io";
import BaseModal from "react-modal";
import { Button } from "../ui/button";
import { ComponentPropsWithoutRef, createContext, useContext } from "react";

interface ModalContextType {
  canClose: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

const Modal = ({
  isOpen,
  onClose,
  canClose = true,
  children,
}: {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <ModalContext.Provider
      value={{
        isOpen,
        onClose: canClose && onClose ? onClose : () => {},
        canClose,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

const ModalContent = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const { isOpen, onClose, canClose } = useModal();
  return (
    <BaseModal
      overlayClassName="fixed inset-0 bg-neutral-900/20 backdrop-blur-xs flex items-center justify-center"
      className={cn(
        "m-auto w-2/3 max-sm:w-90/100 max-w-128 bg-card text-card-foreground flex flex-col gap-6 p-4 rounded-lg border border-zinc-400 shadow-md outline-none",
        className
      )}
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnEsc={canClose}
      shouldCloseOnOverlayClick={canClose}
    >
      {children}
    </BaseModal>
  );
};

const ModalHeader = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { onClose, canClose } = useModal();
  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-4 text-lg font-semibold pb-4 border-b border-neutral-200",
        className
      )}
    >
      <div className="grow">{children}</div>
      {canClose && (
        <Button onClick={onClose} variant={"ghost"} size="icon">
          <IoMdClose />
        </Button>
      )}
    </div>
  );
};

const ModalBody = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("text-sm text-neutral-400", className)}>{children}</div>
  );
};

const ModalFooter = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("flex justify-end items-center gap-2 mt-2", className)}>
      {children}
    </div>
  );
};

const ModalClose = ({ children }: { children?: React.ReactNode }) => {
  const { onClose } = useModal();
  return (
    <Button onClick={onClose} variant={"outline"} className="min-w-28">
      {children ? children : "Cancel"}
    </Button>
  );
};

const ModalPrimaryAction = ({
  disabled = false,
  children,
  onClick,
  ...props
}: {
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
} & ComponentPropsWithoutRef<"button">) => {
  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      variant={"default"}
      className="min-w-28"
      {...props}
    >
      {children ? children : "Confirm"}
    </Button>
  );
};

export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalClose,
  ModalPrimaryAction,
};
