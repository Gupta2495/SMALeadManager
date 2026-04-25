"use client";

import { useRouter } from "next/navigation";

export function LeadRow({
  leadId,
  children,
}: {
  leadId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr onClick={() => router.push(`/leads/${leadId}`)}>
      {children}
    </tr>
  );
}
