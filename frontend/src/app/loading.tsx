export default function Loading() {
  return (
    <div className="theme-surface min-h-screen flex flex-col items-center justify-center gap-4 bg-white animate-pageFade">
      <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-[#1f2937] animate-spin" />
      <p className="text-sm font-medium text-gray-500">Loading…</p>
    </div>
  );
}
