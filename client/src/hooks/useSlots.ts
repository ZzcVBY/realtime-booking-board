import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/api";
import { createSocket } from "../lib/socket";
import type { Booking, SlotView } from "../types";

/**
 * 服务端状态管理：TanStack Query 负责请求缓存/去重/失效，
 * Socket.IO 推送的事件直接"写进" Query 缓存，保证多人实时一致。
 */
export function useSlots() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["slots"],
    queryFn: api.listSlots,
    staleTime: 30_000,
  });

  useEffect(() => {
    const socket = createSocket();

    socket.on("sync", ({ slots }: { slots: SlotView[] }) => {
      queryClient.setQueryData(["slots"], slots);
    });
    socket.on("slot:created", ({ slot }: { slot: SlotView }) => {
      queryClient.setQueryData<SlotView[]>(["slots"], (old) => (old ? [...old, slot] : [slot]));
    });
    socket.on("slot:deleted", ({ slotId }: { slotId: number }) => {
      queryClient.setQueryData<SlotView[]>(["slots"], (old) =>
        old ? old.filter((s) => s.id !== slotId) : old,
      );
    });
    socket.on("booking:created", ({ booking }: { booking: Booking }) => {
      queryClient.setQueryData<SlotView[]>(["slots"], (old) =>
        old
          ? old.map((s) =>
              s.id === booking.slotId
                ? { ...s, bookings: [...s.bookings, booking], bookedCount: s.bookedCount + 1 }
                : s,
            )
          : old,
      );
    });
    socket.on("booking:cancelled", ({ bookingId }: { bookingId: number }) => {
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
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return query;
}
