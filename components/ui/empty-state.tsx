import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <p className="font-medium text-[var(--color-ink)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{description}</p>
    </Card>
  );
}
