import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();

  const utils = trpc.useUtils();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: redirectOnUnauthenticated ? 0 : 1000 * 60 * 5,
    refetchOnMount: redirectOnUnauthenticated ? "always" : false,
    retry: false,
  });

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      await utils.invalidate();
      navigate(redirectPath);
    } finally {
      setIsLoggingOut(false);
    }
  }, [navigate, redirectPath, utils]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || isLoggingOut,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, isLoggingOut, error, logout, refetch],
  );
}
