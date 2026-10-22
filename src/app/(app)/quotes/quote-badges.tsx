import { Badge } from "@/components/ui";

export function StatusBadge({ status }: { status: "draft" | "approved" | "discarded" }) {
  if (status === "approved") return <Badge tone="green" dot>Approved</Badge>;
  if (status === "discarded") return <Badge dot>Discarded</Badge>;
  return <Badge tone="blue" dot>Needs review</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: "quote" | "site_visit" }) {
  return outcome === "site_visit" ? <Badge tone="amber">Site visit</Badge> : null;
}
