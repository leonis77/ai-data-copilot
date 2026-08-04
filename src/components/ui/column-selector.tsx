"use client";

import { CheckCircle, Circle, Tag, Hash, Calendar, Type } from "lucide-react";
import type { ColumnMeta } from "@/lib/templates/types";

const typeIcons: Record<string, React.ComponentType<any>> = {
  number: Hash, date: Calendar, category: Tag, text: Type,
};

const typeColors: Record<string, string> = {
  number: "text-emerald-500", date: "text-sky-500", category: "text-brand", text: "text-tertiary",
};

export function ColumnSelector({
  columns, onChange
}: {
  columns: ColumnMeta[];
  onChange: (cols: ColumnMeta[]) => void;
}) {
  const allSelected = columns.every(function(c) { return c.selected; });

  function toggleAll() {
    const next = !allSelected;
    onChange(columns.map(function(c) { return { ...c, selected: next }; }));
  }

  function toggleOne(idx: number) {
    const next = columns.map(function(c, i) { return i === idx ? { ...c, selected: !c.selected } : c; });
    onChange(next);
  }

  const selectedCount = columns.filter(function(c) { return c.selected; }).length;

  return (
    <div className="card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">选择分析字段</span>
        <span className="text-xs text-faint">{selectedCount}/{columns.length} 已选</span>
      </div>
      <button onClick={toggleAll} className="text-xs text-brand hover:text-primary transition-colors">
        {allSelected ? "取消全选" : "全选"}
      </button>
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {columns.map(function(col, idx) {
          const Icon = typeIcons[col.type] || Type;
          const tc = typeColors[col.type] || "text-tertiary";
          return (
            <button
              key={idx}
              onClick={function() { toggleOne(idx); }}
              className={"flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all border " + (col.selected ? "bg-blue-50 text-primary border-blue-200" : "bg-gray-50 text-tertiary border-gray-100")}
            >
              {col.selected ? <CheckCircle className="w-4 h-4 text-brand shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
              <Icon className={"w-3.5 h-3.5 shrink-0 " + tc} />
              <span className="truncate">{col.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
