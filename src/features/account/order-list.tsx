import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { orderPath } from "@/constants/routes";
import { formatDate, formatIDR } from "@/lib/utils/format";
import type { OrderSummary } from "@/services/account/account";
import { orderStatusInfo } from "@/services/order/status";

export function OrderList({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {orders.map((order) => {
        const status = orderStatusInfo(order.status);
        return (
          <li key={order.orderNumber}>
            <Link
              href={orderPath(order.orderNumber)}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 transition-colors duration-(--duration-base) hover:bg-surface"
            >
              <span className="flex flex-col">
                <span className="font-medium">{order.orderNumber}</span>
                <span className="text-caption text-text-secondary">
                  {formatDate(order.createdAt)} · {order.itemCount} produk
                </span>
              </span>
              <span className="flex items-center gap-4">
                <Badge tone={status.tone}>{status.label}</Badge>
                <span className="font-medium">{formatIDR(order.total)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
