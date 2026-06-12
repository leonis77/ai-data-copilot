"use client";

import { useState, useEffect } from "react";
import { Layers, Plus, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";

interface DatasetSummary { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string }

const SK = "datasets";

export function getSavedDatasets(): { activeId: string; list: DatasetSummary[] } {
  try { const raw = localStorage.getItem(SK); if (!raw) return { activeId: "", list: [] }; return JSON.parse(raw); }
  catch { return { activeId: "", list: [] }; }
}

export function saveDatasets(data: { activeId: string; list: DatasetSummary[] }) {
  localStorage.setItem(SK, JSON.stringify(data));
}

async function removeFromServer(id: string) {
  try { await fetch("/api/upload?id=" + id, { method: "DELETE" }); } catch(e) {}
}

export function TableSelector({ onSelect, className }: { onSelect?: (id: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [active, setActive] = useState("");

  function refresh() {
    const s = getSavedDatasets(); setItems(s.list || []); setActive(s.activeId || "");
  }

  useEffect(function() { refresh(); }, []);

  function doSelect(id: string) {
    const s = getSavedDatasets(); s.activeId = id; saveDatasets(s);
    setActive(id); setOpen(false); if (onSelect) onSelect(id);
  }

  function doDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("确定删除这个数据集？")) return;
    removeFromServer(id);
    const s = getSavedDatasets();
    s.list = s.list.filter(function(d) { return d.id !== id; });
    if (s.activeId === id) s.activeId = s.list.length > 0 ? s.list[0].id : "";
    saveDatasets(s); refresh();
    if (onSelect && s.activeId) onSelect(s.activeId);
  }

  const cur = items.find(function(i) { return i.id === active; });
  const label = cur ? cur.originalName : "无数据";

  return (
    <div className={"relative " + (className || "")}>
      <button onClick={function() { setOpen(!open); }} className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
        <Layers className="w-4 h-4 text-primary-light" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={"w-3 h-3 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 glass rounded-xl shadow-xl z-50 py-2 max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-white/30">{items.length > 0 ? "已上传 " + items.length + " 个数据集" : "暂无数据"}</div>
          {items.map(function(item) {
            const isActive = item.id === active;
            return (
              <div key={item.id} className={"flex items-center " + (isActive ? "bg-primary/20" : "hover:bg-white/5")}>
                <button onClick={function() { doSelect(item.id); }} className="flex-1 text-left px-3 py-2 text-sm transition-all">
                  <div className={isActive ? "truncate text-white" : "truncate text-white/60"}>{item.originalName}</div>
                  <div className="text-xs text-white/30">{item.rowCount} rows x {item.columns.length} cols</div>
                </button>
                <button onClick={function(e: any) { doDelete(e, item.id); }} className="px-2 py-2 text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
