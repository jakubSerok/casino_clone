import { cn } from "@/lib/utils";

export const HistoryDisplay = ({ history }: { history: string[] }) => {
  const getResultColor = (result: string) => {
    if (result === "HEADS") return "bg-yellow-500 text-slate-900";
    return "bg-slate-800 text-white border-2 border-slate-600";
  };

  const getResultIcon = (result: string) => {
    if (result === "HEADS") return "🪙";
    return "⚫";
  };

  return (
    <div className="bg-slate-900/80 rounded-lg p-4 shadow-lg border border-slate-800">
      <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase tracking-wider">Last 20 Flips</h3>
      <div className="flex flex-wrap gap-2">
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">No flips yet</p>
        ) : (
          [...history].reverse().map((result, index) => (
            <div
              key={index}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md transition-transform hover:scale-110",
                getResultColor(result)
              )}
              title={result}
            >
              {getResultIcon(result)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};


