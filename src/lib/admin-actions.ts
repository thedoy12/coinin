import { useState } from "react";
import { apiGetWithHeaders } from "@/lib/api-client";

export function useAdminAction<TInput = void, TResult = unknown>({
  action,
  onSuccess,
  onError,
}: {
  action: string;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (input?: TInput) => {
    setIsPending(true);
    try {
      const result = await apiGetWithHeaders<TResult>("/api/admin/action", {
        "x-coinin-admin-action": action,
        "x-coinin-admin-input": encodeURIComponent(JSON.stringify(input ?? null)),
      });
      await onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Aksi admin gagal"));
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
