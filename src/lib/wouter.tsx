// Compatibility layer: the migrated pages were written against wouter's API.
// It is implemented on TanStack Router so the app keeps a single router.
import { Link as TLink, useLocation as useTLocation, useNavigate } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href?: string;
  to?: string;
  children?: ReactNode;
};

export function Link({ href, to, children, ...rest }: LinkProps) {
  const target = href ?? to ?? "/";
  if (/^(https?:|mailto:|tel:|#)/.test(target)) {
    return (
      <a href={target} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <TLink to={target as never} {...(rest as Record<string, unknown>)}>
      {children}
    </TLink>
  );
}

export function useLocation(): [string, (to: string, opts?: { replace?: boolean }) => void] {
  const location = useTLocation();
  const navigate = useNavigate();
  return [
    location.pathname,
    (to, opts) => {
      void navigate({ to: to as never, replace: opts?.replace });
    },
  ];
}

export function useSearch(): string {
  const location = useTLocation();
  return location.searchStr?.replace(/^\?/, "") ?? "";
}
