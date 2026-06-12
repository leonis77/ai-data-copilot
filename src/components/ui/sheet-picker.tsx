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
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-accent-cyan" />
        <span className="text-sm font-medium text-white/70">选择分析的工作表</span>
        <span className="text-xs text-white/30">{sheets.length} 个可用</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {sheets.map(function(s) {
          var active = s.name === selected;
          return (
            <button
              key={s.name}
              onClick={function() { onSelect(s.name); }}
              className={"flex items-center justify-between px-4 py-3 rounded-lg text-left text-sm transition-all " + (active ? "bg-primary/20 text-white border border-primary/30" : "bg-white/[0.02] text-white/60 hover:bg-white/5 border border-transparent")}
            >
              <div className="flex items-center gap-3">
                {active ? <CheckCircle className="w-4 h-4 text-primary-light shrink-0" /> : <Circle className="w-4 h-4 text-white/20 shrink-0" />}
                <span className="font-medium">{s.name}</span>
              </div>
              <span className="text-xs text-white/30">{s.rowCount} 行</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
