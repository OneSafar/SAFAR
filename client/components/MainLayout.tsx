import { ReactNode } from "react";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import GlobalPageFooter from "./GlobalPageFooter";
import ThemeToggle from "./ui/theme-toggle";

interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  hideSidebar?: boolean;
  homeRoute?: string;
}

export default function MainLayout({
  children,
  userName = "Student",
  userAvatar = "",
  onLogout,
  hideSidebar = false,
  homeRoute = "/landing",
}: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle variant="icon-with-bg" />
      </div>
      
      <div className="flex flex-1 overflow-hidden relative">
        {!hideSidebar && <LeftSidebar homeRoute={homeRoute} />}
        <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">
          <TopNavbar userName={userName} userAvatar={userAvatar} onLogout={onLogout} homeRoute={homeRoute} />
          <main className="flex-1 overflow-y-auto text-slate-800 dark:text-slate-100">
            {children}
            <GlobalPageFooter />
          </main>
        </div>
      </div>
    </div>
  );
}
