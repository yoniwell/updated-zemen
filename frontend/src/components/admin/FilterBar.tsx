interface FilterBarProps {
  filters: Array<{ label: string; value: string }>;
}

export default function FilterBar({ filters }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 font-serif">
      {filters.map((filter) => (
        <button
          key={filter.label}
          className="rounded-md bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700"
        >
          {filter.label}: {filter.value}
        </button>
      ))}
    </div>
  );
}
