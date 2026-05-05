"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { withLocale } from "@/lib/locale-routing";

import { AuthBadge } from "@/components/auth-badge";
import { GithubStarsLink } from "@/components/github-stars-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PetdexLogo } from "@/components/petdex-logo";
import { SubmitCTA } from "@/components/submit-cta";
import { ThemeToggle } from "@/components/theme-toggle";

import { hasLocale, type Locale } from "@/i18n/config";

type SiteHeaderProps = {
  /** When true, hide the primary "Submit a pet" CTA (e.g. on /submit itself). */
  hideSubmitCta?: boolean;
};

export function SiteHeader({ hideSubmitCta = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const currentLocale: Locale = hasLocale(locale) ? locale : "en";
  const t = useTranslations("header");
  const common = useTranslations("common");

  function href(pathname: string) {
    return withLocale(pathname, currentLocale);
  }

  // Close menu on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="flex items-center justify-between gap-3">
        <PetdexLogo href={href("/")} ariaLabel={common("petdexHome")} />

        <div className="hidden items-center gap-7 text-sm text-muted-2 md:flex">
          <Link
            href={href("/create")}
            className="transition hover:text-foreground"
          >
            {t("create")}
          </Link>
          <Link
            href={href("/birth")}
            className="transition hover:text-foreground"
          >
            Birth onchain
          </Link>
          <Link
            href={href("/docs")}
            className="transition hover:text-foreground"
          >
            {t("docs")}
          </Link>
          <Link
            href={href("/leaderboard")}
            className="transition hover:text-foreground"
          >
            {t("topCreators")}
          </Link>
          <Link
            href={href("/requests")}
            className="transition hover:text-foreground"
          >
            {t("requests")}
          </Link>
          <Link
            href={href("/about")}
            className="transition hover:text-foreground"
          >
            {t("about")}
          </Link>
          <GithubStarsLink />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hideSubmitCta ? null : (
            <SubmitCTA
              href={href("/submit")}
              className="hidden h-10 items-center justify-center rounded-full bg-inverse px-4 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover md:inline-flex"
            >
              {t("submitCta")}
            </SubmitCTA>
          )}
          <ThemeToggle />
          <LocaleSwitcher />
          <AuthBadge />
          <button
            type="button"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-border-base bg-surface/70 text-muted-2 transition hover:bg-surface md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <PetdexLogo href={href("/")} ariaLabel={common("petdexHome")} />
            <button
              type="button"
              aria-label={t("closeMenu")}
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full border border-border-base bg-surface text-muted-2 transition hover:bg-surface-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-5 text-lg">
            <MobileLink href={href("/create")} onClick={() => setOpen(false)}>
              {t("create")}
            </MobileLink>
            <MobileLink href={href("/birth")} onClick={() => setOpen(false)}>
              Birth onchain
            </MobileLink>
            <MobileLink href={href("/docs")} onClick={() => setOpen(false)}>
              {t("docs")}
            </MobileLink>
            <MobileLink
              href={href("/leaderboard")}
              onClick={() => setOpen(false)}
            >
              {t("topCreators")}
            </MobileLink>
            <MobileLink href={href("/requests")} onClick={() => setOpen(false)}>
              {t("requests")}
            </MobileLink>
            <MobileLink href={href("/about")} onClick={() => setOpen(false)}>
              {t("about")}
            </MobileLink>
            <GithubStarsLink
              size="mobile"
              className="rounded-2xl px-4 py-3 hover:bg-surface-muted"
            />
          </nav>

          {!hideSubmitCta ? (
            <div className="mt-auto p-5">
              <SubmitCTA
                href={href("/submit")}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-inverse px-6 text-base font-medium text-on-inverse transition hover:bg-inverse-hover"
              >
                {t("submitCta")}
              </SubmitCTA>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-2xl px-4 py-3 text-foreground transition hover:bg-white dark:hover:bg-stone-800"
    >
      {children}
    </Link>
  );
}
