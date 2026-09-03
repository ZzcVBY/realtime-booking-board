const timeFmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtTime(ms: number): string {
  return timeFmt.format(new Date(ms));
}

export function fmtRange(start: number, end: number): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

export function isPast(start: number): boolean {
  return start < Date.now();
}
