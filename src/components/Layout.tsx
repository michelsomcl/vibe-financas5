
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import FloatingActionButton from "./FloatingActionButton";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full bg-secondary">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
        <FloatingActionButton />
      </main>
    </div>
  );
};

export default Layout;
