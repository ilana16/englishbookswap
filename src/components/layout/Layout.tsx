
import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNavigation } from "./BottomNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export function Layout({ children, hideHeader }: LayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Hide header on My Books page
  const isMyBooksPage = location.pathname === "/my-books";
  const shouldHideHeader = hideHeader || isMyBooksPage;
  
  return (
    <div className="flex flex-col min-h-screen">
      {!shouldHideHeader && <Header />}
      <main className="flex-grow pb-16">{children}</main>
      <Footer />
      {isMobile && <BottomNavigation />}
    </div>
  );
}
