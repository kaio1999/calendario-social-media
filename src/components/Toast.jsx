export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-v4 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-v4/30">
      {message}
    </div>
  );
}
