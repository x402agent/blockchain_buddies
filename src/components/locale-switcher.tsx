"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";

import { useAuth } from "@clerk/nextjs";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { stripLocalePrefix, withLocale } from "@/lib/locale-routing";

import { hasLocale, type Locale } from "@/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const OPTIONS: Array<{ locale: Locale; code: string; label: string }> = [
  { locale: "en", code: "EN", label: "English" },
  { locale: "es", code: "ES", label: "Español" },
  { locale: "zh", code: "ZH", label: "中文" },
];

// Suspense wrapper — useSearchParams forces Next to bail out of static
// generation unless the consumer is inside a Suspense boundary. Wrapping
// the inner component here means every <SiteHeader /> can keep rendering
// statically; only the locale switcher hydrates client-side.
export function LocaleSwitcher() {
  return (
    <Suspense
      fallback={
        <span className="grid size-10 place-items-center rounded-full border border-border-base bg-surface/70 text-muted-2">
          <Globe className="size-4" />
        </span>
      }
    >
      <LocaleSwitcherInner />
    </Suspense>
  );
}

function LocaleSwitcherInner() {
  const locale = useLocale();
  const currentLocale = hasLocale(locale) ? locale : "en";
  const current =
    OPTIONS.find((option) => option.locale === currentLocale) ?? OPTIONS[0];
  const { isSignedIn } = useAuth();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectLocale(nextLocale: Locale) {
    if (nextLocale === currentLocale) {
      setOpen(false);
      return;
    }

    const cookieStore = (
      window as Window & {
        cookieStore?: {
          set(input: {
            name: string;
            value: string;
            path: string;
            expires: number;
            sameSite: "lax";
          }): Promise<void>;
        };
      }
    ).cookieStore;
    void cookieStore?.set({
      name: "NEXT_LOCALE",
      value: nextLocale,
      path: "/",
      expires: Date.now() + COOKIE_MAX_AGE * 1000,
      sameSite: "lax",
    });

    if (isSignedIn) {
      void fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferredLocale: nextLocale }),
      });
    }

    const basePath = stripLocalePrefix(pathname);
    const query = searchParams.toString();
    const nextPath = withLocale(basePath, nextLocale);
    const href = query ? `${nextPath}?${query}` : nextPath;

    setOpen(false);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${t("language")}: ${current.label}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border-base bg-surface/70 px-3 text-xs font-semibold tracking-[0.2em] text-muted-2 uppercase backdrop-blur transition hover:bg-white dark:hover:bg-stone-800"
      >
        <Globe className="size-4" />
        <span>{current.code}</span>
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-[60] mt-2 min-w-40 overflow-hidden rounded-2xl border border-border-base bg-surface shadow-xl shadow-blue-950/15">
          {OPTIONS.map((option) => (
            <button
              key={option.locale}
              type="button"
              disabled={isPending}
              onClick={() => selectLocale(option.locale)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-wait disabled:opacity-70"
            >
              <span>{option.label}</span>
              <span className="font-mono text-xs tracking-[0.2em] text-muted-2 uppercase">
                {option.code}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
