"use client";

import { Layers, CheckCircle, Circle } from "lucide-react";

export interface SheetInfo { name: string; rowCount: number }

export function SheetPicker({
  sheets, selected, onSelect
}: {
  sheets: SheetInfo[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  if (sheets.length <= 1) return null;

  return (
    <div className="card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-primary">选择分析的工作表</span>
        <span className="text-xs text-faint">{sheets.length} 个可用</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {sheets.map(function(s) {
          var active = s.name === selected;
          return (
            <button
              key={s.name}
              onClick={function() { onSelect(s.name); }}
              className={"flex items-center justify-between px-4 py-3 rounded-lg text-left text-sm transition-all border " + (active ? "bg-blue-50 text-primary border-blue-200" : "bg-gray-50 text-secondary border-gray-100")}
            >
              <div className="flex items-center gap-3">
                {active ? <CheckCircle className="w-4 h-4 text-brand shrink-0" /> : <Circle className="w-4 h-4 text-faint shrink-0" />}
                <span className="font-medium">{s.name}</span>
              </div>
              <span className="text-xs text-faint">{s.rowCount} 行</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
