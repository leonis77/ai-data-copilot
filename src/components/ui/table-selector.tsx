"use client";

import { useState, useEffect } from "react";
import { Layers, Plus, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { getStore, setStore, removeDataset } from "@/lib/store";

interface DatasetSummary { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string }

export function TableSelector({ onSelect, className }: { onSelect?: (id: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [active, setActive] = useState("");

  function refresh() {
    const s = getStore();
    setItems(s.datasets);
    setActive(s.activeId);
  }

  useEffect(function() { refresh(); }, []);

  function doSelect(id: string) {
    const s = getStore();
    s.activeId = id;
    setStore(s);
    setActive(id); setOpen(false);
    if (onSelect) onSelect(id);
  }

  async function doDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("\u786E\u5B9A\u5220\u9664\u8FD9\u4E2A\u6570\u636E\u96C6\uFF1F")) return;
    try { await fetch("/api/upload?id=" + id, { method: "DELETE" }); } catch {}
    const s = removeDataset(id);
    setItems(s.datasets);
    setActive(s.activeId);
    if (onSelect && s.activeId) onSelect(s.activeId);
  }

  const cur = items.find(function(i) { return i.id === active; });
  const label = cur ? cur.originalName : "\u65E0\u6570\u636E";

  return (
    <div className={"relative " + (className || "")}>
      <button onClick={function() { setOpen(!open); }} className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
        <Layers className="w-4 h-4 text-primary-light" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={"w-3 h-3 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 glass rounded-xl shadow-xl z-50 py-2 max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-white/30">{items.length > 0 ? "\u5DF2\u4E0A\u4F20 " + items.length + " \u4E2A\u6570\u636E\u96C6" : "\u6682\u65E0\u6570\u636E"}</div>
          {items.map(function(item) {
            const isActive = item.id === active;
            return (
              <div key={item.id} className={"flex items-center " + (isActive ? "bg-primary/20" : "hover:bg-white/5")}>
                <button onClick={function() { doSelect(item.id); }} className="flex-1 text-left px-3 py-2 text-sm transition-all">
                  <div className={isActive ? "truncate text-white" : "truncate text-white/60"}>{item.originalName}</div>
                  <div className="text-xs text-white/30">{item.rowCount} rows x {item.columns.length} cols</div>
                </button>
                <button onClick={function(e) { doDelete(e, item.id); }} className="px-2 py-2 text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <div className="border-t border-white/5 mt-1 pt-1">
            <Link href="/upload" className="flex items-center gap-2 px-3 py-2 text-sm text-primary-light hover:bg-white/5 transition-all">
              <Plus className="w-3 h-3" /> \u4E0A\u4F20\u65B0\u6570\u636E
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
