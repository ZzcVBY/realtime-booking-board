export interface User {
  id: number;
  username: string;
  createdAt: number;
}

/** 登录态：token + 当前用户 */
export interface AuthUser {
  id: number;
  username: string;
  token: string;
}

export interface Slot {
  id: number;
  title: string;
  description: string;
  startTime: number; // unix ms
  endTime: number;
  capacity: number;
  creatorId: number;
  createdAt: number;
}

export interface Booking {
  id: number;
  slotId: number;
  userId: number;
  userName: string;
  status: "active" | "cancelled";
  createdAt: number;
}

export interface SlotView extends Slot {
  creatorName: string;
  bookings: Booking[];
  bookedCount: number;
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
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
}
