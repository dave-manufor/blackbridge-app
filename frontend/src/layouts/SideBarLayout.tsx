import AppSideBar from "@/components/features/navigation/AppSideBar";
import AppHeader from "@components/features/navigation/AppHeader";
import { Outlet } from "react-router";

const SideBarLayout = () => {
  return (
    <>
      <AppSideBar />
      <main className="flex-1 flex flex-col py-4 px-6">
        <AppHeader />
        <Outlet />
      </main>
    </>
  );
};

export default SideBarLayout;
