import { createTRPCReact } from "@trpc/react-query";
import { TRPCClientError, httpLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          const body = await response.text().catch(() => "");
          const message = summarizeNonJsonApiResponse(body, response.status);
          throw new TRPCClientError(message);
        }

        return response;
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function summarizeNonJsonApiResponse(body: string, status: number) {
  const cleanBody = body.replace(/\s+/g, " ").trim();
  if (cleanBody.toLowerCase().startsWith("an error occurred")) {
    return "Server API sedang error. Cek konfigurasi Vercel dan environment variable pembayaran.";
  }
  if (cleanBody) {
    return cleanBody.slice(0, 180);
  }
  return `Server API mengembalikan respons tidak valid (${status}).`;
}
