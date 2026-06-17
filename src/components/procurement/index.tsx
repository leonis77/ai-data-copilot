"use client";

import { useMemo } from "react";
import { SupplyHealth } from "./supply-health";
import { PurchaseList } from "./purchase-list";
import type { PriceAnalysis, TaggedProduct } from "@/lib/procurement";
import { analyzePrice, tagProducts } from "@/lib/procurement";

interface ProcurementPanelProps {
  datasetData: any;
  datasetName: string;
}

function findCol(cols: string[], patterns: RegExp[]): string | undefined {
  for (var pi = 0; pi < patterns.length; pi++) {
    var found = cols.find(function(c: string) { return c !== "sheet_name" && patterns[pi].test(c); });
    if (found) return found;
  }
  return undefined;
}

export function ProcurementPanel({ datasetData, datasetName }: ProcurementPanelProps) {
  const { price, tagged, avgPrice } = useMemo(function() {
    const rows = datasetData?.rows || [];
    const cols = datasetData?.columns || [];
    const priceCol = findCol(cols, [/\u4ef7/, /price/, /\u91d1\u989d/, /amount/]);
    const nameCol = findCol(cols, [/name/, /\u540d\u79f0/, /\u5546\u54c1/, /\u4ea7\u54c1/, /title/]);
    const catCol = findCol(cols, [/\u5206\u7c7b/, /category/, /\u7c7b\u522b/, /\u54c1\u7c7b/]);

    let priceData: PriceAnalysis | null = null;
    let taggedData: TaggedProduct[] = [];
    let avg = 0;

    if (priceCol && rows.length > 0) {
      priceData = analyzePrice(rows, priceCol);
      if (priceData && nameCol) {
        taggedData = tagProducts(rows, nameCol, catCol || cols[0], priceCol, priceData.p25, priceData.p75);
        avg = priceData.mean;
      }
    }
    return { price: priceData, tagged: taggedData, avgPrice: avg };
  }, [datasetData]);

  if (!price) return null;

  return (
    <div className="space-y-6">
      <SupplyHealth price={price} tagged={tagged} datasetName={datasetName} />
      {tagged.length > 0 && (
        <PurchaseList products={tagged} categoryName={datasetName} avgPrice={avgPrice} />
      )}
    </div>
  );
}
