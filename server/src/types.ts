export interface Slot {
  id: number;
  title: string;
  description: string;
  startTime: number; // unix ms
  endTime: number; // unix ms
  capacity: number;
  creatorId: string;
  createdAt: number;
}

export interface Booking {
  id: number;
  slotId: number;
  userId: string;
  status: "active" | "cancelled";
  createdAt: number;
}

/** 供前端展示的"排班位"聚合视图：包含该位上的预约与占用状态 */
export interface SlotView extends Slot {
  bookings: Booking[];
  bookedCount: number;
}

/** 一个用户当前占用的时间区间（用于冲突检测） */
export interface OccupiedInterval {
  bookingId: number;
  slotId: number;
  startTime: number;
  endTime: number;
}
