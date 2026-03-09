export function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--card-border)] bg-[color:var(--empty-bg)] px-5 py-8 text-center">
      <p className="text-base font-bold text-[color:var(--text-main)]">{props.title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{props.description}</p>
    </div>
  );
}
