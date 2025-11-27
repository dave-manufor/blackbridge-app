import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/lib/validators";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import PasswordInput, { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { Navigate } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import { useShallow } from "zustand/react/shallow";
import { Link } from "react-router";
import { SessionStorageService } from "@/lib/WebStorageService";
import storageKeys from "@/config/constants/storageKeys";
import AuthLayout from "@/layouts/AuthLayout";

const SignIn = () => {
  const storage = new SessionStorageService();
  const { authenticated, authLoading, authError, clearAuthError, signIn } =
    useAuthStore(
      useShallow((state) => ({
        authenticated: state.authenticated,
        authLoading: state.authLoading,
        authError: state.authError,
        clearAuthError: state.clearAuthError,
        signIn: state.signIn,
      }))
    );
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
    resolver: zodResolver(signInSchema),
  });

  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    signIn(data.email, data.password);
  };

  if (authenticated) {
    const raw = storage.getItem<string>(storageKeys.AUTH.REDIRECT);
    storage.removeItem(storageKeys.AUTH.REDIRECT);
    const redirect = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
    return <Navigate to={redirect} replace />;
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your details to access your account"
    >
      <Form {...form}>
        <form
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-700">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="name@company.com" 
                    {...field} 
                    className="h-12 bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-neutral-700">Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput 
                    placeholder="Enter your password" 
                    {...field} 
                    className="h-12 bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            disabled={authLoading} 
            type="submit"
            className="h-12 text-base font-medium rounded-xl shadow-lg shadow-primary-600/20 transition-all mt-2"
          >
            {authLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        <span className="text-neutral-500">Don't have an account? </span>
        <Link 
          to="/sign-up" 
          className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
};

export default SignIn;
