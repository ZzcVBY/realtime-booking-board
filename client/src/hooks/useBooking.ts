import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Booking, SlotView } from "../types";

/**
 * 乐观更新（optimistic UI）：
 * 提交前先改缓存 → 失败回滚 → 结束后强制刷新，保证与服务端最终一致。
 * 这是"性能 + 交互体验"的关键点：用户不用等网络，点完立即有反馈。
 */
export function useBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, userId }: { slotId: number; userId: string }) => api.book(slotId, userId),
    onMutate: async ({ slotId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["slots"] });
      const previous = queryClient.getQueryData<SlotView[]>(["slots"]);
      const tempBooking: Booking = {
        id: -Date.now(),
        slotId,
        userId,
        status: "active",
        createdAt: Date.now(),
      };
      queryClient.setQueryData<SlotView[]>(["slots"], (old) =>
        old
          ? old.map((s) =>
              s.id === slotId
                ? { ...s, bookings: [...s.bookings, tempBooking], bookedCount: s.bookedCount + 1 }
                : s,
            )
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["slots"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId }: { bookingId: number }) => api.cancel(bookingId),
    onMutate: async ({ bookingId }) => {
      await queryClient.cancelQueries({ queryKey: ["slots"] });
      const previous = queryClient.getQueryData<SlotView[]>(["slots"]);
      queryClient.setQueryData<SlotView[]>(["slots"], (old) =>
        old
          ? old.map((s) => {
              const had = s.bookings.some((b) => b.id === bookingId);
              if (!had) return s;
              return {
                ...s,
                bookings: s.bookings.filter((b) => b.id !== bookingId),
                bookedCount: s.bookedCount - 1,
              };
            })
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["slots"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
