"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { TextAlignJustify } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useGitHubAuth } from "@/lib/auth/github";
import { GithubIcon } from "@/components/icons";

export type NavigationSection = {
  title: string;
  href: string;
};

const navigationData: NavigationSection[] = [
  {
    title: "Features",
    href: "#features",
  },
  {
    title: "How it works",
    href: "#how",
  },
  {
    title: "Testimonials",
    href: "#testimonials",
  },
  {
    title: "Integrations",
    href: "#integrations",
  },
];

const SignInButton = ({ className }: { className?: string }) => {
  const { signInWithGitHub } = useGitHubAuth();
  return (
    <Button
      onClick={signInWithGitHub}
      className={cn(
        "relative text-sm font-semibold rounded-full h-10 p-1 ps-5 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-5 w-fit overflow-hidden",
        className,
      )}
    >
      <span className="relative z-10 transition-all duration-500 hover:cursor-pointer">Sign in</span>
      <div className="absolute right-1 w-8 h-8 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-36px)] group-hover:rotate-45">
        <GithubIcon className="h-4 w-4" />
      </div>
    </Button>
  );
};

const WayCodeLogo = () => (
  <a href="#top" className="flex items-center gap-2">
    <Image
      src="/logo.png"
      alt="WayCode logo"
      width={32}
      height={32}
      className="h-8 w-8 rounded-xl object-cover"
    />
    <span className="text-[17px] font-extrabold tracking-tight text-gradient-brand">WayCode</span>
  </a>
);

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 50);
  }, []);

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 1024) setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll, handleResize]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        sticky ? "bg-white/70 backdrop-blur-xl border-b border-black/[0.05]" : "bg-transparent",
      )}
    >
      <div id="top" />
      <div className="max-w-7xl mx-auto w-full px-4 py-3 sm:px-6">
        <nav
          className={cn(
            "w-full flex items-center h-fit justify-between gap-3.5 lg:gap-6 transition-all duration-500",
            sticky
              ? "p-2.5 bg-background/60 backdrop-blur-lg border border-border/40 shadow-2xl shadow-primary/5 rounded-full"
              : "bg-transparent border-transparent",
          )}
        >
          <WayCodeLogo />
          <NavigationMenu className="max-lg:hidden bg-muted p-0.5 rounded-full">
            <NavigationMenuList className="flex gap-0">
              {navigationData.map((navItem) => (
                <NavigationMenuItem key={navItem.title}>
                  <NavigationMenuLink
                    href={navItem.href}
                    className="px-2 lg:px-4 py-2 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-background outline outline-transparent hover:outline-border hover:shadow-xs transition tracking-normal"
                  >
                    {navItem.title}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <SignInButton className="hidden sm:flex" />

          <div className="sm:hidden flex items-center gap-2">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className="rounded-full bg-background border border-border p-2 outline-none flex items-center justify-center cursor-pointer transition-colors">
                <TextAlignJustify size={20} />
                <span className="sr-only">Menu</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 mt-2">
                {navigationData.map((item) => (
                  <DropdownMenuItem key={item.title}>
                    <a href={item.href} className="w-full cursor-pointer text-sm font-medium">
                      {item.title}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <SignInButton />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
