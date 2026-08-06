"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const fadeOutDuration = 170;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const navigationKeys = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

export function SectionMotion() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const frame = document.querySelector<HTMLElement>(".route-transition");
    if (!frame) return;

    frame.classList.remove("is-fading-out");
    frame.style.animation = "none";
    void frame.offsetWidth;
    frame.style.animation = "";
  }, [pathname]);

  useEffect(() => {
    let animationFrame = 0;
    let fadeTimer = 0;

    const stopScrollAnimation = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isCurrentPage = destination.pathname === window.location.pathname && destination.search === window.location.search;
      const target = destination.hash
        ? document.getElementById(decodeURIComponent(destination.hash.slice(1)))
        : isCurrentPage
          ? document.getElementById("top")
          : null;

      event.preventDefault();

      if (isCurrentPage && target) {
        window.clearTimeout(fadeTimer);
        stopScrollAnimation();

        const headerHeight = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
        const start = window.scrollY;
        const end = Math.max(0, target.getBoundingClientRect().top + start - headerHeight);
        const distance = end - start;

        window.history.pushState(null, "", destination.hash || destination.pathname);

        if (reducedMotion || Math.abs(distance) < 2) {
          window.scrollTo(0, end);
          return;
        }

        const duration = Math.min(760, Math.max(420, Math.abs(distance) * 0.45));
        const startedAt = performance.now();

        const step = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - progress, 4);
          window.scrollTo(0, start + distance * eased);

          if (progress < 1) {
            animationFrame = window.requestAnimationFrame(step);
          } else {
            animationFrame = 0;
          }
        };

        animationFrame = window.requestAnimationFrame(step);
        return;
      }

      const routePath = basePath && destination.pathname.startsWith(`${basePath}/`)
        ? destination.pathname.slice(basePath.length)
        : destination.pathname;
      const navigate = () => router.push(`${routePath}${destination.search}${destination.hash}`);
      const frame = document.querySelector<HTMLElement>(".route-transition");

      if (reducedMotion || !frame) {
        navigate();
        return;
      }

      window.clearTimeout(fadeTimer);
      frame.classList.add("is-fading-out");
      fadeTimer = window.setTimeout(navigate, fadeOutDuration);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (navigationKeys.has(event.key)) stopScrollAnimation();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("wheel", stopScrollAnimation, { passive: true });
    window.addEventListener("touchstart", stopScrollAnimation, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(fadeTimer);
      stopScrollAnimation();
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("wheel", stopScrollAnimation);
      window.removeEventListener("touchstart", stopScrollAnimation);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return null;
}
