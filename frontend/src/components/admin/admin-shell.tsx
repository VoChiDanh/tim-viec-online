"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CodeXml,
  Flag,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Shapes,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/modules/cores/shadcn/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/cores/shadcn/components/ui/dropdown-menu";
import { SiteFooter } from "@/components/layout/site-footer";
import { logoutAction } from "@/app/(auth)/actions";
import "./admin.css";

interface AdminShellProps {
  children: ReactNode;
  reportedCount?: number;
}

export function AdminShell({ children, reportedCount = 3 }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const systemNav = [
    {
      href: "/admin",
      label: "Tổng quan",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      href: "/admin/jobs",
      label: "Kiểm duyệt tin",
      icon: Flag,
      active: pathname.startsWith("/admin/jobs"),
      badge: reportedCount > 0 ? reportedCount : undefined,
    },
    {
      href: "/admin/users",
      label: "Tài khoản người dùng",
      icon: Users,
      active: pathname.startsWith("/admin/users"),
    },
  ];

  const catalogNav = [
    {
      href: "/admin/categories",
      label: "Ngành nghề",
      icon: Shapes,
      active: pathname.startsWith("/admin/categories"),
    },
    {
      href: "/admin/skills",
      label: "Kỹ năng",
      icon: CodeXml,
      active: pathname.startsWith("/admin/skills"),
    },
  ];

  const sidebarContent = (
    <>
      <p className="ap-nav-label">Quản trị hệ thống</p>
      <nav className="ap-nav" aria-label="Vận hành">
        {systemNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="ap-icon" aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className="ap-nav-count"
                  aria-label={`${item.badge} tin bị báo cáo`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ap-nav-divider" />

      <p className="ap-nav-label">Danh mục hệ thống</p>
      <nav className="ap-nav" aria-label="Danh mục">
        {catalogNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="ap-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ap-sidebar-bottom">
        <ShieldCheck className="ap-icon" aria-hidden="true" />
        <strong>Quản trị có trách nhiệm</strong>
        <p>
          Mỗi quyết định góp phần xây dựng một môi trường tuyển dụng an toàn.
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 text-[var(--ap-muted)] hover:text-[var(--ap-blue)] text-[11px] bg-transparent border-0 p-0 cursor-pointer font-inherit"
          >
            <LogOut className="ap-icon shrink-0" aria-hidden="true" />
            <span>Về trang đăng nhập</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="admin-page">
      <a href="#main" className="ap-skip">
        Đến nội dung chính
      </a>

      {/* Header */}
      <header className="ap-header">
        <div className="ap-header-left">
          {/* Mobile hamburger menu drawer */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="ap-icon-button ap-mobile-menu"
                aria-label="Mở điều hướng quản trị"
              >
                <Menu className="ap-icon" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="p-4 border-b border-border text-left">
                <SheetTitle className="text-base font-semibold">
                  Không gian quản trị
                </SheetTitle>
              </SheetHeader>
              <div className="p-4">{sidebarContent}</div>
            </SheetContent>
          </Sheet>

          {/* Logo brand */}
          <Link
            className="ap-brand"
            href="/"
            aria-label="TimViecOnline — Trang chủ"
          >
            <svg
              className="ap-brand-mark"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
            >
              <rect width="36" height="36" rx="10" fill="var(--ap-blue)" />
              <path
                d="M10 18L16 24L26 12"
                stroke="var(--ap-white)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="26" cy="12" r="3" fill="var(--ap-orange)" />
            </svg>
            <span>
              <strong>
                TimViec<span>Online</span>
              </strong>
              <small>Kết nối đúng nhân tài</small>
            </span>
          </Link>

          <span className="ap-header-label">Không gian quản trị</span>
        </div>

        <div className="ap-header-right">
          <Link href="/jobs" className="ap-public-link">
            Trang việc làm <ArrowUpRight className="ap-icon" aria-hidden="true" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ap-profile bg-transparent border-0 cursor-pointer"
                aria-label="Xem tài khoản quản trị viên"
              >
                <span className="ap-avatar">QT</span>
                <span>
                  <strong>Quản Trị Viên</strong>
                  <small>Quản trị hệ thống</small>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/admin/users" className="cursor-pointer">
                  <UserRound className="mr-2 size-4" />
                  <span>Quản lý tài khoản</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={logoutAction} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 size-4" />
                    <span>Đăng xuất</span>
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Layout */}
      <div className="ap-layout">
        <aside className="ap-sidebar" aria-label="Điều hướng quản trị">
          {sidebarContent}
        </aside>

        <main className="ap-main" id="main" tabIndex={-1}>
          {children}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

