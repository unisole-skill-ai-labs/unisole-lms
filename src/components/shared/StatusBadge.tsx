import React from "react";
import Badge from "../ui/Badge";

export default function StatusBadge({ status, className = "" }) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "active":
    case "enrolled":
    case "completed":
    case "paid":
    case "published":
      return <Badge variant="emerald" className={className}>{status || "Active"}</Badge>;
    case "pending":
    case "in_progress":
    case "draft":
      return <Badge variant="amber" className={className}>{status || "In Progress"}</Badge>;
    case "failed":
    case "cancelled":
    case "expired":
      return <Badge variant="rose" className={className}>{status || "Inactive"}</Badge>;
    default:
      return <Badge variant="indigo" className={className}>{status || "Standard"}</Badge>;
  }
}
