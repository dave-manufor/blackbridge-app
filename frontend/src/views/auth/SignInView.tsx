import authStyles from "./Auth.module.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/lib/validators";
import Logo from "@/assets/img/blackbridge-logo.svg";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "react-router";
import { SessionStorageService } from "@/lib/WebStorageService";
import storageKeys from "@/config/constants/storageKeys";

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
          <h1>Sign in to your account</h1>
          <p>Welcome back! Enter your account details to sign in</p>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={authLoading} type="submit">
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className={authStyles.formFooter}>
          Don't have an account?
          <Link to="/sign-up" className="link font-semibold">
            Sign Up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignIn;
