export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <section className="pazora-page-gutter pb-24 pt-[calc(var(--pazora-header-height)+4rem)]">
        <div className="mx-auto max-w-[1600px]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.07]" />

          <div className="mt-5 h-10 w-[min(34rem,80vw)] animate-pulse rounded-lg bg-white/[0.06]" />

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({
              length: 12,
            }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.045]"
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}