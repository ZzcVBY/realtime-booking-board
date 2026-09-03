import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    capacity: number;
  }) => void;
}

function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateSlotModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("1");
  // 用惰性初始化，避免在渲染时调用 Date.now()（纯函数规则）
  const [start, setStart] = useState(() => toLocalInput(Date.now() + 60 * 60 * 1000));
  const [end, setEnd] = useState(() => toLocalInput(Date.now() + 2 * 60 * 60 * 1000));

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      capacity: Number(capacity) || 1,
      startTime: new Date(start).getTime(),
      endTime: new Date(end).getTime(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <h2 className="text-lg font-semibold text-slate-100">新建排班</h2>
        <label className="mt-4 block text-sm text-slate-400">
          标题
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            placeholder="例如：后端小组周会"
            required
          />
        </label>
        <label className="mt-3 block text-sm text-slate-400">
          说明
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            rows={2}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-400">
            开始
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm text-slate-400">
            结束
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm text-slate-400">
          容量
          <input
            type="number"
            min={1}
            max={64}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            创建
          </button>
        </div>
      </form>
    </div>
  );
}
