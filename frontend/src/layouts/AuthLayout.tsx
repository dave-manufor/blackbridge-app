import { ReactNode } from "react";
import Logo from "@/assets/img/blackbridge-logo.svg";
import LogoDark from "@/assets/img/blackbridge-logo-black.svg";


interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: ReactNode;
  image?: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full flex bg-surface-background">
      {/* Left Side - Branding/Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/0 via-neutral-900/60 to-neutral-900/90"></div>
        
        <div className="relative z-10">
          <img src={Logo} alt="Blackbridge Logo" className="h-8 w-auto invert brightness-0" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-bold text-white mb-4">
            Secure File Transfer for the Modern Web
          </h2>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Experience end-to-end encryption, lightning-fast speeds, and a beautiful interface designed for professionals.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 bg-surface-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <img src={LogoDark} alt="Blackbridge Logo" className="h-8 w-auto" />
          </div>
          
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
              {title}
            </h1>
            <p className="text-neutral-500 text-sm sm:text-base">
              {subtitle}
            </p>
          </div>

          {children}

          <div className="pt-6 text-center text-sm text-neutral-400">
            &copy; {new Date().getFullYear()} Blackbridge. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
