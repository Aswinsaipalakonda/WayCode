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
  { title: "Hero", href: "#top" },
  { title: "How it works", href: "#how" },
  { title: "Testimonials", href: "#testimonials" },
  { title: "Integrations", href: "#integrations" },
];

const SignInButton = ({ className }: { className?: string }) => {
  const { signInWithGitHub } = useGitHubAuth();
  return (
    <Button
      onClick={signInWithGitHub}
      className={cn(
        "relative cursor-pointer text-sm font-semibold rounded-full h-10 p-1 ps-5 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-5 w-fit overflow-hidden bg-white text-[#14161c] shadow-[0_8px_24px_-10px_rgba(255,255,255,0.45)] hover:bg-slate-200",
        className,
      )}
    >
      <span className="relative z-10 transition-all duration-500">Sign in</span>
      <div className="absolute right-1 w-8 h-8 bg-[#14161c] text-white rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-36px)] group-hover:rotate-45">
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
      className="h-8 w-8 rounded-xl object-cover ring-1 ring-white/15"
    />
    <span className="text-[17px] font-extrabold tracking-tight text-white">WayCode</span>
  </a>
);

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 50);
    let current = "";
    for (const { href } of navigationData) {
      const el = document.getElementById(href.slice(1));
      if (el && el.getBoundingClientRect().top <= 160) current = href;
    }
    setActive(current);
  }, []);

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 1024) setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll, handleResize]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        sticky
          ? "border-white/10 bg-[#14161c]/90 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          : "border-transparent bg-[#14161c]",
      )}
    >
      <div id="top" />
      <div className="max-w-7xl mx-auto w-full px-4 py-3 sm:px-6">
        <nav
          className={cn(
            "w-full flex items-center h-fit justify-between gap-3.5 lg:gap-6 transition-all duration-500",
            sticky
              ? "p-2 pl-3 pr-2 bg-[#1e222b]/80 backdrop-blur-xl border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_50px_-20px_rgba(0,0,0,0.9)] rounded-full"
              : "bg-transparent border-transparent",
          )}
        >
          <WayCodeLogo />

          {/* Desktop nav — scroll-spy active chip */}
          <NavigationMenu className="max-lg:hidden p-1 bg-black/30 rounded-full ring-1 ring-white/[0.08]">
            <NavigationMenuList className="flex gap-0">
              {navigationData.map((navItem) => {
                const isActive = active === navItem.href;
                return (
                  <NavigationMenuItem key={navItem.title}>
                    <NavigationMenuLink
                      href={navItem.href}
                      data-active={isActive || undefined}
                      className={cn(
                        "relative px-2 lg:px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 tracking-normal",
                        isActive
                          ? "text-white bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] shadow-[0_6px_18px_-6px_var(--brand-glow)]"
                          : "text-slate-300 hover:text-white hover:bg-white/10",
                      )}
                    >
                      {navItem.title}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <SignInButton className="hidden sm:flex" />

          {/* Mobile */}
          <div className="sm:hidden flex items-center gap-2">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className="rounded-full bg-white/[0.07] border border-white/10 text-white p-2 outline-none flex items-center justify-center cursor-pointer transition-colors hover:bg-white/15">
                <TextAlignJustify size={20} />
                <span className="sr-only">Menu</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 mt-2 bg-[#1e222b] border-white/10 text-slate-200">
                {navigationData.map((item) => (
                  <DropdownMenuItem key={item.title} data-active={active === item.href || undefined} className={cn(active === item.href && "bg-white/10")}>
                    <a href={item.href} className="w-full cursor-pointer text-sm font-medium hover:text-white">
                      {item.title}
                    </a>
                  </DropdownMenuItem>
                ))}
                <div className="sm:hidden pt-2 mt-1 border-t border-white/10">
                  <SignInButton className="w-full flex" />
                </div>
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
