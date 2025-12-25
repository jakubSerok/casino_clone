// Add this to your imports
import { cn } from "@/lib/utils";

// Add this component inside your RouletteRoom component, before the return statement
export const HistoryDisplay = ({ history }: { history: number[] }) => {
  const getNumberColor = (num: number) => {
    if (num === 0) return "bg-green-500 text-white";
    const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNums.includes(num) ? "bg-red-600 text-white" : "bg-black text-white";
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Last 20 Spins</h3>
      <div className="flex flex-wrap gap-2">
        {history.length === 0 ? (
          <p className="text-gray-400">No spins yet</p>
        ) : (
          [...history].reverse().map((num, index) => (
            <div
              key={index}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md",
                getNumberColor(num),
                num === 0 && "text-base" // Make 0 slightly bigger
              )}
            >
              {num}
            </div>
          ))
        )}
      </div>
    </div>
  );
};