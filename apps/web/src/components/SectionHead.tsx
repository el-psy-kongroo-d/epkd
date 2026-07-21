import type { ReactNode } from "react";

export function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {aside}
    </div>
  );
}
