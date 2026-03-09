import type { ReactNode } from 'react';

export function SectionCard(props: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-5 shadow-card backdrop-blur-2xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-[color:var(--text-main)]">{props.title}</h2>
          {props.description ? (
            <p className="mt-1 text-sm leading-6 text-[color:var(--text-sub)]">{props.description}</p>
          ) : null}
        </div>
        {props.action ? <div className="shrink-0">{props.action}</div> : null}
      </div>
      {props.children}
    </section>
  );
}
