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

/** 服务端返回的排班位聚合视图 */
export interface SlotView extends Slot {
  bookings: Booking[];
  bookedCount: number;
}

export interface ApiError {
  ok: false;
  code: string;
  message: string;
}

export interface CreateSlotInput {
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  capacity?: number;
  creatorId: string;
}
