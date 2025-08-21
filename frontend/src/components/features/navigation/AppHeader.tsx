import useAppHeader from "@hooks/context/useAppHeader";
import { SidebarTrigger } from "@components/ui/sidebar";
const AppHeader = () => {
  const { headerTitle } = useAppHeader();

  return (
    <header className="w-full flex justify-between items-center mb-8">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="size-9 [&_svg:not([class*='size-'])]:size-7 hover:bg-neutral-200 cursor-pointer" />
        <span className="text-2xl font-semibold">{headerTitle}</span>
      </div>
    </header>
  );
};

export default AppHeader;
