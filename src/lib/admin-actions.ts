import { useState } from "react";
import { apiPostJson } from "@/lib/api-client";

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
      const result = await runAdminAction<TInput, TResult>(action, input);
      await onSuccess?.(result);
      return result;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Aksi admin gagal"));
      return undefined;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}

export function runAdminAction<TInput = void, TResult = unknown>(action: string, input?: TInput) {
  return apiPostJson<TResult>("/api/admin/action", {
    action,
    input: input ?? null,
  });
}
