import authStyles from "./Auth.module.css";
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
import Logo from "@/assets/img/blackbridge-logo.svg";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "react-router";
import { SessionStorageService } from "@/lib/WebStorageService";
import storageKeys from "@/config/constants/storageKeys";

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
    const redirect = storage.getItem<string>(storageKeys.AUTH.REDIRECT);
    storage.removeItem(storageKeys.AUTH.REDIRECT);
    return <Navigate to={redirect || "/"} replace />;
  }

  return (
    <div className={authStyles.container}>
      <div className={authStyles.banner}>
        <img
          src={Logo}
          alt="Blackbridge Logo"
          className="max-w-[70%] h-auto mb-4"
        />
      </div>
      <Card className={authStyles.formWrapper}>
        <CardHeader className={authStyles.formHeader}>
          <h1>Create a free account</h1>
          <p>
            End-to-end encrypted file sharing — your files, your keys, your
            control.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="max-w-[480px] mt-6 mx-auto flex flex-col gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Password" {...field} />
                    </FormControl>
                    {password && (
                      <div className="flex flex-col gap-[4px] mt-[8px]">
                        <span className="flex gap-[4px] items-center small-text">
                          {hasMinLength ? (
                            <IoIosCheckmarkCircle
                              className="text-[1.2em]"
                              color="var(--success-green-500"
                            />
                          ) : (
                            <IoIosCloseCircle color="var(--error-red-500)" />
                          )}
                          <span
                            className={cn({ "line-through": hasMinLength })}
                          >
                            Minimum 12 characters
                          </span>
                        </span>
                        <span className="flex gap-[4px] items-center small-text">
                          {hasUpperCase ? (
                            <IoIosCheckmarkCircle
                              className="text-[1.2em]"
                              color="var(--success-green-500)"
                            />
                          ) : (
                            <IoIosCloseCircle color="var(--error-red-500)" />
                          )}
                          <span
                            className={cn({ "line-through": hasUpperCase })}
                          >
                            At least one uppercase letter
                          </span>
                        </span>
                        <span className="flex gap-[4px] items-center small-text">
                          {hasLowerCase ? (
                            <IoIosCheckmarkCircle
                              className="text-[1.2em]"
                              color="var(--success-green-500)"
                            />
                          ) : (
                            <IoIosCloseCircle color="var(--error-red-500)" />
                          )}
                          <span
                            className={cn({ "line-through": hasLowerCase })}
                          >
                            At least one lowercase letter
                          </span>
                        </span>
                        <span className="flex gap-[4px] items-center small-text">
                          {hasOneDigit ? (
                            <IoIosCheckmarkCircle
                              className="text-[1.2em]"
                              color="var(--success-green-500)"
                            />
                          ) : (
                            <IoIosCloseCircle color="var(--error-red-500)" />
                          )}
                          <span className={cn({ "line-through": hasOneDigit })}>
                            At least one digit
                          </span>
                        </span>
                        <span className="flex gap-[4px] items-center small-text">
                          {hasSpecialChar ? (
                            <IoIosCheckmarkCircle
                              className="text-[1.2em]"
                              color="var(--success-green-500)"
                            />
                          ) : (
                            <IoIosCloseCircle color="var(--error-red-500)" />
                          )}
                          <span
                            className={cn({ "line-through": hasSpecialChar })}
                            style={{ textTransform: "none" }}
                          >
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Confirm Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={authLoading} type="submit">
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className={authStyles.formFooter}>
          Already have an account?
          <Link to="/sign-in" className="link font-semibold">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
