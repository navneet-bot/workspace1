export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="h-24 rounded-[18px] border border-jj-border bg-[rgba(255,255,255,0.03)] animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-[18px] border border-jj-border bg-[rgba(255,255,255,0.03)] animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[320px] rounded-[18px] border border-jj-border bg-[rgba(255,255,255,0.03)] animate-pulse" />
        <div className="h-[320px] rounded-[18px] border border-jj-border bg-[rgba(255,255,255,0.03)] animate-pulse" />
      </div>
    </div>
  );
}