import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ApiError, Booking, SlotView } from "../types";
import { useSlots } from "../hooks/useSlots";
import { useBook, useCancel } from "../hooks/useBooking";
import { useUser } from "../hooks/useUser";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../hooks/useToast";
import { SlotList } from "../components/SlotList";
import { CreateSlotModal } from "../components/CreateSlotModal";

export function Board() {
  const { user, setUser } = useUser();
  const { data: slots = [], isLoading, isError } = useSlots();
  const queryClient = useQueryClient();
  const { toasts, push } = useToast();

  const [filter, setFilter] = useState("");
  const debounced = useDebouncedValue(filter, 250);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.creatorId.toLowerCase().includes(q),
    );
  }, [slots, debounced]);

  const errMsg = (e: unknown) =>
    e && typeof e === "object" && "message" in e ? (e as ApiError).message : "请求失败";

  const createSlot = useMutation({
    mutationFn: (input: Parameters<typeof api.createSlot>[0]) => api.createSlot(input),
    onSuccess: () => setModalOpen(false),
    onError: (e) => push(errMsg(e), "error"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["slots"] }),
  });

  // 预约 / 取消由 useBooking 提供乐观更新，这里在各回调里补 toast
  const bookAction = useBook();
  const cancelAction = useCancel();

  const handleBook = (slot: SlotView) => {
    if (!user) return push("请先填写昵称", "error");
    bookAction.mutate(
      { slotId: slot.id, userId: user },
      {
        onError: (e) => push(errMsg(e), "error"),
        onSuccess: () => push(`已预约「${slot.title}」`, "success"),
      },
    );
  };

  const handleCancel = (booking: Booking) => {
    cancelAction.mutate({ bookingId: booking.id }, {
      onError: (e) => push(errMsg(e), "error"),
      onSuccess: () => push("已取消预约", "success"),
    });
  };

  const handleDelete = (slot: SlotView) => {
    api
      .deleteSlot(slot.id, user)
      .then(() => push(`已删除「${slot.title}」`, "success"))
      .catch((e) => push(errMsg(e), "error"))
      .finally(() => queryClient.invalidateQueries({ queryKey: ["slots"] }));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">实时协同预约排班看板</h1>
          <p className="text-sm text-slate-400">多人实时同步 · 后端权威校验 · 乐观更新</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="你的昵称"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            新建排班
          </button>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          placeholder="搜索标题 / 说明 / 创建者…"
        />
        <span className="whitespace-nowrap text-xs text-slate-500">
          共 {filtered.length} 条
        </span>
      </div>

      {isLoading && <p className="mt-8 text-center text-slate-400">加载中…</p>}
      {isError && <p className="mt-8 text-center text-rose-400">加载失败，请确认后端已启动</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="mt-8 text-center text-slate-400">暂无排班，点击右上角"新建排班"。</p>
      )}

      <div className="mt-4">
        <SlotList
          slots={filtered}
          currentUser={user}
          onBook={handleBook}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      </div>

      <CreateSlotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(input) => createSlot.mutate({ ...input, creatorId: user || "匿名" })}
      />

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "rounded-lg px-4 py-2 text-sm shadow-lg " +
              (t.level === "error"
                ? "bg-rose-600 text-white"
                : t.level === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-100")
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
