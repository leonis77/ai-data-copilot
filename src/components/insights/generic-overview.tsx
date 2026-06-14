"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Hash, Calendar, Tag, Type, DollarSign, BarChart3 } from "lucide-react";

// Column role detection patterns
var ROLE_PATTERNS: Record<string, RegExp> = {
  id: /\u7f16\u53f7|id$|\u5355\u53f7|\u7535\u8bdd|phone|mobile|\u90ae\u7bb1|email|code/i,
  name: /\u540d\u79f0|\u6807\u9898|name|title|\u5546\u54c1|\u4ea7\u54c1|\u5b9d\u8d1d/i,
  price: /\u4ef7|\u91d1\u989d|\u8d39|price|amount|cost|total|\u5b9e\u4ed8|\u4ed8\u6b3e|pay|revenue/i,
  date: /\u65f6\u95f4|\u65e5\u671f|\u5468\u671f|date|time|\u4e0b\u5355|\u521b\u5efa|order/i,
  category: /\u5206\u7c7b|\u72b6\u6001|status|category|\u7c7b\u578b|\u65b9\u5f0f|\u6e20\u9053/i,
  address: /\u5730\u5740|addr|\u7701|\u5e02|\u6536\u8d27|\u533a\u57df|region|location/i,
  quantity: /\u6570\u91cf|\u9500\u91cf|quantity|qty|count|\u4ef6\u6570|volume/i,
};

var roleIcons: Record<string, any> = {
  id: Hash, name: Type, price: DollarSign, date: Calendar, category: Tag, address: BarChart3, quantity: BarChart3,
};

var roleLabels: Record<string, string> = {
  id: "ID/\u7f16\u53f7", name: "\u540d\u79f0", price: "\u4ef7\u683c/\u91d1\u989d", date: "\u65e5\u671f",
  category: "\u5206\u7c7b", address: "\u5730\u5740", quantity: "\u6570\u91cf",
};

function detectRole(col: string): string {
  for (var r in ROLE_PATTERNS) { if (ROLE_PATTERNS[r].test(col)) return r; }
  return "text";
}

function detectValueType(rows: any[], col: string): "number" | "date" | "text" {
  var sample = rows.slice(0, 50);
  var numCount = 0, dateCount = 0, total = 0;
  for (var i = 0; i < sample.length; i++) {
    var v = sample[i][col];
    if (v === undefined || v === null || v === "") continue;
    total++;
    if (typeof v === "number" || (!isNaN(Number(v)) && Number(v) !== 0)) numCount++;
    var d = new Date(v);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) dateCount++;
  }
  if (total === 0) return "text";
  if (numCount > total * 0.7) return "number";
  if (dateCount > total * 0.7) return "date";
  return "text";
}

interface GenericOverviewProps {
  columns: string[];
  rows: any[];
  datasetName: string;
}

export function GenericOverview({ columns, rows, datasetName }: GenericOverviewProps) {
  var analysis = useMemo(function() {
    var result: any[] = [];
    var numCols: any[] = [];
    var idCols: string[] = [];

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      var role = detectRole(col);
      var valType = detectValueType(rows, col);

      // If role says price but values are numbers, override type
      if (valType === "number") {
        var vals = rows.slice(0, 200).map(function(r) { return Number(r[col]); }).filter(function(v) { return !isNaN(v) && v > 0; });
        if (vals.length > 0) {
          var sum = vals.reduce(function(a, b) { return a + b; }, 0);
          numCols.push({ col: col, role: role, avg: Math.round(sum / vals.length * 100) / 100, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), count: vals.length });
        }
      }

      if (role === "id") { idCols.push(col); continue; }

      result.push({ col: col, role: role, valType: valType });
    }

    return { columns: result, numeric: numCols, ids: idCols, totalCols: columns.length, effectiveCols: result.length, totalRows: rows.length };
  }, [columns, rows]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Summary card */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
        style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 30% 20%, rgba(124,92,255,0.08), transparent 40%), rgba(17,24,39,0.5)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <span className="text-xl font-bold gradient-text block">{analysis.totalRows}</span>
            <p className="text-xs text-white/30">{"\u884c\u6570"}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <span className="text-xl font-bold gradient-text block">{analysis.totalCols}</span>
            <p className="text-xs text-white/30">{"\u5217\u6570"}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <span className="text-xl font-bold gradient-text block">{analysis.numeric.length}</span>
            <p className="text-xs text-white/30">{"\u6570\u503c\u5217"}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <span className="text-xl font-bold gradient-text block">{analysis.effectiveCols}</span>
            <p className="text-xs text-white/30">{"\u6709\u6548\u5217"}</p>
          </div>
        </div>
        {analysis.ids.length > 0 && (
          <p className="text-xs text-white/20">
            {"\u5df2\u8fc7\u6ee4 ID \u5217: "}{analysis.ids.join("\u3001")}
          </p>
        )}
      </div>

      {/* Column roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analysis.columns.map(function(item, i) {
          var Icon = roleIcons[item.role] || Type;
          var label = roleLabels[item.role] || "\u6587\u672c";
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.01 }}
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.05]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70">{item.col}</p>
                <p className="text-xs text-white/25">{label} {"\u00b7"} {item.valType}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Numeric quick stats */}
      {analysis.numeric.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl p-6 border border-white/[0.06]"
          style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 30% 20%, rgba(124,92,255,0.08), transparent 40%), rgba(17,24,39,0.5)" }}>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">{"\u6570\u503c\u5217\u7edf\u8ba1"}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {analysis.numeric.map(function(item, i) {
              var Icon = roleIcons[item.role] || Hash;
              return (
                <div key={i} className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3 h-3 text-white/40" />
                    <span className="text-xs text-white/50">{item.col}</span>
                  </div>
                  <div className="text-sm text-white/70">
                    {"\u00A5"}{item.min} - {"\u00A5"}{item.max}
                  </div>
                  <div className="text-xs text-white/25">
                    {"\u5747\u503c"} {"\u00A5"}{item.avg} {"\u00b7"} {item.count} {"\u6761"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
