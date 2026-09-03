export interface User {
  id: number;
  username: string;
  createdAt: number;
}

export interface Slot {
  id: number;
  title: string;
  description: string;
  startTime: number; // unix ms
  endTime: number; // unix ms
  capacity: number;
  creatorId: number; // 用户 id（服务端权威，非昵称）
  createdAt: number;
}

export interface Booking {
  id: number;
  slotId: number;
  userId: number;
  userName: string; // 展示用：关联用户表
  status: "active" | "cancelled";
  createdAt: number;
}

/** 供前端展示的"排班位"聚合视图 */
export interface SlotView extends Slot {
  creatorName: string;
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

/** 认证中间件挂到 req 上的用户信息 */
export interface AuthUser {
  sub: number;
  username: string;
}

export interface RefreshTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: number;
  revoked: number; // 0/1
}
