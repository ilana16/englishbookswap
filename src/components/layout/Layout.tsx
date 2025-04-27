
import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNavigation } from "./BottomNavigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pb-16">{children}</main>
      <Footer />
      {isMobile && <BottomNavigation />}
    </div>
  );
}
