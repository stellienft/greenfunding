interface BarItem {
  label: string;
  value: number;
  formatted?: string;
  color?: string;
}

interface Props {
  title: string;
  items: BarItem[];
  emptyMessage?: string;
}

export function SimpleBar({ title, items, emptyMessage = 'No data available' }: Props) {
  const max = Math.max(...items.map(i => i.value), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[#3A475B] mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 font-medium truncate flex-1 mr-2">{item.label}</span>
                <span className="text-xs font-semibold text-[#3A475B] flex-shrink-0">
                  {item.formatted ?? item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color ?? 'bg-[#28AA48]'}`}
                  style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
