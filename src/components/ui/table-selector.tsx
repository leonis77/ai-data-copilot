"use client";

import { useState, useEffect } from "react";
import { Layers, Plus, ChevronDown } from "lucide-react";
import Link from "next/link";

interface DatasetSummary { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string }

const SK = "datasets";

export function getSavedDatasets(): { activeId: string; list: DatasetSummary[] } {
  try {
    const raw = localStorage.getItem(SK);
    if (!raw) return { activeId: "", list: [] };
    return JSON.parse(raw);
  } catch { return { activeId: "", list: [] }; }
}

export function saveDatasets(data: { activeId: string; list: DatasetSummary[] }) {
  localStorage.setItem(SK, JSON.stringify(data));
}

export function TableSelector({ onSelect, className }: { onSelect?: (id: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [active, setActive] = useState("");

  useEffect(function() {
    var saved = getSavedDatasets();
    setItems(saved.list || []);
    setActive(saved.activeId || "");
  }, []);

  function select(id: string) {
    var saved = getSavedDatasets();
    saved.activeId = id;
    saveDatasets(saved);
    setActive(id);
    setOpen(false);
    if (onSelect) onSelect(id);
  }

  var current = items.find(function(i) { return i.id === active; });
  var label = current ? current.originalName : "无数据";

  return (
    <div className={"relative " + (className || "")}>
      <button onClick={function() { setOpen(!open); }} className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
        <Layers className="w-4 h-4 text-primary-light" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={"w-3 h-3 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 w-64 glass rounded-xl shadow-xl z-50 py-2 max-h-64 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-white/30">已上传的数据集</div>
          {items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-white/30 text-center">暂无数据</div>
          ) : items.map(function(item) {
            var isActive = item.id === active;
            return (
              <button key={item.id} onClick={function() { select(item.id); }} className={"w-full text-left px-3 py-2 text-sm transition-all " + (isActive ? "bg-primary/20 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80")}>
                <div className="truncate">{item.originalName}</div>
                <div className="text-xs opacity-50">{item.rowCount} rows x {item.columns.length} cols</div>
              </button>
            );
          })}
          <div className="border-t border-white/5 mt-1 pt-1">
            <Link href="/upload" className="flex items-center gap-2 px-3 py-2 text-sm text-primary-light hover:bg-white/5 transition-all">
              <Plus className="w-3 h-3" /> 上传新数据
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
