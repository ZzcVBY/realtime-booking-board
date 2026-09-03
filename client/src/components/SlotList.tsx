import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Booking, SlotView } from "../types";
import { SlotCard } from "./SlotCard";

interface Props {
  slots: SlotView[];
  currentUserId: number;
  onBook: (slot: SlotView) => void;
  onCancel: (booking: Booking) => void;
  onDelete: (slot: SlotView) => void;
}

/**
 * 虚拟化列表：无论多少数据，只渲染可视区域内的卡片。
 * 是"性能优化"最直观的证据——DOM 数量恒定，首屏渲染不随数据量线性增长。
 */
export const SlotList = memo(function SlotList({
  slots,
  currentUserId,
  onBook,
  onCancel,
  onDelete,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: slots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className="thin-scroll h-[62vh] overflow-auto lg:h-[68vh]">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const slot = slots[item.index];
          return (
            <div
              key={item.key}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
            >
              <SlotCard
                slot={slot}
                currentUserId={currentUserId}
                onBook={onBook}
                onCancel={onCancel}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
