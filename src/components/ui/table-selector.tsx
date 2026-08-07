"use client";

import { useState, useEffect } from "react";
import { Layers, Plus, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { getStore, setStore, removeDataset } from "@/lib/store";
import { authFetch } from "@/lib/auth-fetch";

interface DatasetSummary { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string }


export function getSavedDatasets(userId?: string) {
  const s = getStore(userId || "");
  return { activeId: s.activeId, list: s.datasets };
}
export function saveDatasets(userId: string, data: { activeId: string; list: any[] }) {
  setStore(userId, { activeId: data.activeId, datasets: data.list });
}

export function TableSelector({ onSelect, className, userId }: { onSelect?: (id: string) => void; className?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [active, setActive] = useState("");

  function refresh() {
    const s = getStore(userId || "");
    setItems(s.datasets);
    setActive(s.activeId);
  }

  useEffect(function() { refresh(); }, [userId]);

  function doSelect(id: string) {
    const s = getStore(userId || "");
    s.activeId = id;
    setStore(userId || "", s);
    setActive(id); setOpen(false);
    if (onSelect) onSelect(id);
  }

  async function doDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("确定删除这个数据集？")) return;
    try { await authFetch("/api/upload?id=" + id, { method: "DELETE" }); } catch {}
    const s = removeDataset(userId || "", id);
    setItems(s.datasets);
    setActive(s.activeId);
    if (onSelect && s.activeId) onSelect(s.activeId);
  }

  const cur = items.find(function(i) { return i.id === active; });
  const label = cur ? cur.originalName : "无数据";

  return (
    <div className={"relative " + (className || "")}>
      <button onClick={function() { setOpen(!open); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary hover:text-primary transition-all">
        <Layers className="w-4 h-4 text-brand" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={"w-3 h-3 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 w-72 max-w-[90vw] bg-white border border-gray-200 shadow-lg rounded-xl z-50 py-2 max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-faint">{items.length > 0 ? "已上传 " + items.length + " 个数据集" : "暂无数据"}</div>
          {items.map(function(item) {
            const isActive = item.id === active;
            return (
              <div key={item.id} className={"flex items-center " + (isActive ? "bg-blue-50" : "hover:bg-gray-50")}>
                <button onClick={function() { doSelect(item.id); }} className="flex-1 text-left px-3 py-2 text-sm transition-all">
                  <div className={isActive ? "truncate text-primary" : "truncate text-secondary"}>{item.originalName}</div>
                  <div className="text-xs text-faint">{item.rowCount} rows x {item.columns.length} cols</div>
                </button>
                <button onClick={function(e) { doDelete(e, item.id); }} className="px-2 py-2 text-faint hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <Link href="/upload" className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-50 transition-all">
              <Plus className="w-3 h-3" /> 上传新数据
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
