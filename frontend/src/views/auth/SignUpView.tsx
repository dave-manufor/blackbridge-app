import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@/lib/validators";
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
import { z } from "zod";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Navigate } from "react-router";
import {
  minLengthRegex,
  oneDigitRegex,
  oneLowercaseRegex,
  oneSpecialCharacterRegex,
  oneUppercaseRegex,
} from "@/lib/regex";
import { IoIosCheckmarkCircle, IoIosCloseCircle } from "react-icons/io";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useShallow } from "zustand/react/shallow";
import { Link } from "react-router";
import { SessionStorageService } from "@/lib/WebStorageService";
import storageKeys from "@/config/constants/storageKeys";
import AuthLayout from "@/layouts/AuthLayout";

const SignUp = () => {
  const storage = new SessionStorageService();
  const { authenticated, authError, clearAuthError, authLoading, signUp } =
    useAuthStore(
      useShallow((state) => ({
        authenticated: state.authenticated,
        authError: state.authError,
        clearAuthError: state.clearAuthError,
        authLoading: state.authLoading,
        signUp: state.signUp,
      }))
    );

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
    resolver: zodResolver(signUpSchema),
  });

  const password = form.watch("password");
  const hasMinLength = minLengthRegex(12).test(password);
  const hasUpperCase = oneUppercaseRegex.test(password);
  const hasLowerCase = oneLowercaseRegex.test(password);
  const hasOneDigit = oneDigitRegex.test(password);
  const hasSpecialChar = oneSpecialCharacterRegex.test(password);

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    signUp(data.email, data.password);
  };

  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearAuthError();
    }
  }, [authenticated, authError, clearAuthError]);

  if (authenticated) {
    const raw = storage.getItem<string>(storageKeys.AUTH.REDIRECT);
    storage.removeItem(storageKeys.AUTH.REDIRECT);
    const redirect = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
    return <Navigate to={redirect} replace />;
  }

  return (
    <AuthLayout
      title="Create a free account"
      subtitle="End-to-end encrypted file sharing — your files, your keys, your control."
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
                <FormLabel className="text-neutral-700">Password</FormLabel>
                <FormControl>
                  <PasswordInput 
                    placeholder="Create a password" 
                    {...field} 
                    className="h-12 bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl"
                  />
                </FormControl>
                {password && (
                  <div className="flex flex-col gap-1 mt-2 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <span className="flex gap-2 items-center text-xs text-neutral-600">
                      {hasMinLength ? (
                        <IoIosCheckmarkCircle className="text-success-green-500 text-base" />
                      ) : (
                        <IoIosCloseCircle className="text-error-red-500 text-base" />
                      )}
                      <span className={cn({ "line-through text-neutral-400": hasMinLength })}>
                        Minimum 12 characters
                      </span>
                    </span>
                    <span className="flex gap-2 items-center text-xs text-neutral-600">
                      {hasUpperCase ? (
                        <IoIosCheckmarkCircle className="text-success-green-500 text-base" />
                      ) : (
                        <IoIosCloseCircle className="text-error-red-500 text-base" />
                      )}
                      <span className={cn({ "line-through text-neutral-400": hasUpperCase })}>
                        At least one uppercase letter
                      </span>
                    </span>
                    <span className="flex gap-2 items-center text-xs text-neutral-600">
                      {hasLowerCase ? (
                        <IoIosCheckmarkCircle className="text-success-green-500 text-base" />
                      ) : (
                        <IoIosCloseCircle className="text-error-red-500 text-base" />
                      )}
                      <span className={cn({ "line-through text-neutral-400": hasLowerCase })}>
                        At least one lowercase letter
                      </span>
                    </span>
                    <span className="flex gap-2 items-center text-xs text-neutral-600">
                      {hasOneDigit ? (
                        <IoIosCheckmarkCircle className="text-success-green-500 text-base" />
                      ) : (
                        <IoIosCloseCircle className="text-error-red-500 text-base" />
                      )}
                      <span className={cn({ "line-through text-neutral-400": hasOneDigit })}>
                        At least one digit
                      </span>
                    </span>
                    <span className="flex gap-2 items-center text-xs text-neutral-600">
                      {hasSpecialChar ? (
                        <IoIosCheckmarkCircle className="text-success-green-500 text-base" />
                      ) : (
                        <IoIosCloseCircle className="text-error-red-500 text-base" />
                      )}
                      <span className={cn({ "line-through text-neutral-400": hasSpecialChar })}>
                        At least one special character
                      </span>
                    </span>
                  </div>
                )}
              </FormItem>
            )}
          />
          <FormField
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-700">Confirm Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Confirm your password"
                    {...field}
                    className="h-12 bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-100 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm leading-relaxed mt-2">
            <strong className="block mb-1">⚠️ Important Warning</strong> 
            Blackbridge uses end-to-end encryption. If you lose your password, we cannot recover it, and <strong>all your encrypted files will be permanently lost</strong>. Please save it securely.
          </div>
          <Button 
            disabled={authLoading} 
            type="submit"
            className="h-12 text-base font-medium rounded-xl shadow-lg shadow-primary-600/20 transition-all mt-2"
          >
            {authLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        <span className="text-neutral-500">Already have an account? </span>
        <Link 
          to="/sign-in" 
          className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
