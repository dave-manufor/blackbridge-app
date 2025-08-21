import { Toaster } from "react-hot-toast";

const ToastWrapper = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        duration: 5000,
        style: {
          background: "var(--surface-foreground)",
          color: "var(--neutral-500)",
        },

        // Default options for specific types
        success: {
          iconTheme: {
            primary: "var(--success-green-500)",
            secondary: "var(--neutral-0)",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--error-red-500)",
            secondary: "var(--neutral-0)",
          },
        },
      }}
    />
  );
};
export default ToastWrapper;
