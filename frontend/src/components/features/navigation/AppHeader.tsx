import useAppHeader from "@hooks/context/useAppHeader";
import { SidebarTrigger } from "@components/ui/sidebar";
const AppHeader = () => {
  const { headerTitle } = useAppHeader();

  return (
    <header className="w-full flex justify-between items-center pb-6 pt-2">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="size-10 [&_svg]:size-6 hover:bg-neutral-100 text-neutral-500 transition-colors rounded-xl" />
        <h1 className="text-2xl font-semibold text-neutral-800 tracking-tight">{headerTitle}</h1>
      </div>
    </header>
  );
};

export default AppHeader;
