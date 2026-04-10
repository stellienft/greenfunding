import type { DateFilter } from './types';

interface Props {
  filter: DateFilter;
  onChange: (f: DateFilter) => void;
}

export function DateRangePicker({ filter, onChange }: Props) {
  const setPreset = (range: '7d' | '30d') => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (range === '7d' ? 7 : 30));
    onChange({
      range,
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {(['7d', '30d'] as const).map(r => (
          <button
            key={r}
            onClick={() => setPreset(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filter.range === r
                ? 'bg-white text-[#3A475B] shadow-sm'
                : 'text-gray-500 hover:text-[#3A475B]'
            }`}
          >
            Last {r === '7d' ? '7 days' : '30 days'}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...filter, range: 'custom' })}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            filter.range === 'custom'
              ? 'bg-white text-[#3A475B] shadow-sm'
              : 'text-gray-500 hover:text-[#3A475B]'
          }`}
        >
          Custom
        </button>
      </div>
      {filter.range === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.from}
            onChange={e => onChange({ ...filter, from: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#3A475B] focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filter.to}
            onChange={e => onChange({ ...filter, to: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#3A475B] focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30"
          />
        </div>
      )}
    </div>
  );
}
