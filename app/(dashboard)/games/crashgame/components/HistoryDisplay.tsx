import { cn } from "@/lib/utils";

export const HistoryDisplay = ({ history }: { history: number[] }) => {
  const getColor = (value: number) => {
    if (value < 2.0) return "bg-red-600 text-white";
    if (value < 10.0) return "bg-yellow-500 text-slate-900";
    if (value < 50.0) return "bg-emerald-500 text-white";
    return "bg-purple-600 text-white";
  };

  return (
    <div className="bg-slate-900/80 rounded-lg p-4 shadow-lg border border-slate-800">
      <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase tracking-wider">Last 20 Crashes</h3>
      <div className="flex flex-wrap gap-2">
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">No crashes yet</p>
        ) : (
          [...history].reverse().map((value, index) => (
            <div
              key={index}
              className={cn(
                "px-4 py-2 rounded-lg flex items-center justify-center font-bold text-sm shadow-md transition-transform hover:scale-110",
                getColor(value)
              )}
              title={`Crashed at ${value.toFixed(2)}x`}
            >
              {value.toFixed(2)}x
            </div>
          ))
        )}
      </div>
    </div>
  );
};

