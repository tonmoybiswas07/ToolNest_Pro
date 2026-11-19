export default function AdminLoading() {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <span className="sr-only">Loading administration data</span>
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="surface h-28 motion-safe:animate-pulse"
          aria-hidden
        />
      ))}
    </div>
  );
}
