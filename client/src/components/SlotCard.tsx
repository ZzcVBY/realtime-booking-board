import { memo } from "react";
import type { Booking, SlotView } from "../types";
import { fmtRange, isPast } from "../lib/format";

interface Props {
  slot: SlotView;
  currentUser: string;
  onBook: (slot: SlotView) => void;
  onCancel: (booking: Booking) => void;
  onDelete: (slot: SlotView) => void;
}

/**
 * 单个排班卡（已 memo 化，配合虚拟化列表减少无关重渲染）
 */
export const SlotCard = memo(function SlotCard({
  slot,
  currentUser,
  onBook,
  onCancel,
  onDelete,
}: Props) {
  const full = slot.bookedCount >= slot.capacity;
  const past = isPast(slot.startTime);
  const myBooking = slot.bookings.find((b) => b.userId === currentUser);
  const mine = myBooking?.status === "active";
  const isCreator = slot.creatorId === currentUser;

  return (
    <article className="mb-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{slot.title}</h3>
          <p className="mt-0.5 text-sm tabular-nums text-slate-400">
            {fmtRange(slot.startTime, slot.endTime)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && (
            <button
              onClick={() => onDelete(slot)}
              className="rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10"
            >
              删除
            </button>
          )}
          <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">
            创建者 {slot.creatorId}
          </span>
        </div>
      </header>

      {slot.description && (
        <p className="mt-2 text-sm text-slate-400">{slot.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, (slot.bookedCount / slot.capacity) * 100)}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-400">
          {slot.bookedCount}/{slot.capacity}
        </span>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {slot.bookings.map((b) => (
            <span
              key={b.id}
              className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
            >
              {b.userId}
            </span>
          ))}
          {slot.bookedCount === 0 && <span className="text-xs text-slate-500">暂无预约</span>}
        </div>

        <div className="flex gap-2">
          {mine ? (
            <button
              onClick={() => myBooking && onCancel(myBooking)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-amber-300 hover:bg-slate-700"
            >
              取消我的预约
            </button>
          ) : (
            <button
              disabled={!currentUser || full || past}
              onClick={() => onBook(slot)}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {past ? "已开始" : full ? "已约满" : "预约"}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
});
