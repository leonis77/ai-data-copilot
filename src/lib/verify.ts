import type { MatchEvidence, VerifiedClaim } from "./semantic/types";
import { logger } from "./logger";

/*
 * Verify an AI-generated claim against actual data.
 * Checks: do the referenced columns exist? Do the claimed values match?
 */
export function verifyClaim(
  claim: string,
  evidence: MatchEvidence[],
  allRows: Record<string, unknown>[],
  allColumns: string[]
): VerifiedClaim {
  var verified = true;
  var limitations: string[] = [];

  for (var i = 0; i < evidence.length; i++) {
    var e = evidence[i];
    
    // Check: does the referenced column exist?
    if (!allColumns.includes(e.column)) {
      verified = false;
      limitations.push("Column " + e.column + " not found in data");
      continue;
    }
    
    // Check: does the referenced row exist?
    if (e.row < 0 || e.row >= allRows.length) {
      verified = false;
      limitations.push("Row " + e.row + " out of bounds (0-" + (allRows.length - 1) + ")");
      continue;
    }
    
    // Check: does the value match?
    var actualValue = allRows[e.row][e.column];
    var claimedStr = String(e.value);
    var actualStr = actualValue !== undefined && actualValue !== null ? String(actualValue) : "";
    
    // Numeric comparison: allow some rounding difference
    var claimedNum = parseFloat(claimedStr);
    var actualNum = parseFloat(actualStr);
    if (!isNaN(claimedNum) && !isNaN(actualNum)) {
      if (Math.abs(claimedNum - actualNum) > 0.01) {
        verified = false;
        limitations.push("Value mismatch at row " + e.row + ", col " + e.column + ": claimed " + claimedStr + " vs actual " + actualStr);
      }
    } else if (claimedStr !== actualStr) {
      // String comparison
      verified = false;
      limitations.push("Value mismatch at row " + e.row + ", col " + e.column + ": claimed " + claimedStr + " vs actual " + actualStr);
    }
  }

  return {
    claim: claim,
    evidence: evidence,
    calculation: "",
    sampleSize: evidence.length,
    confidence: verified ? 0.95 : 0.3,
    verified: verified,
    limitations: limitations.length > 0 ? limitations.join("; ") : "Verified against source data",
  };
}

/*
 * Extract numeric claims from AI response text.
 * Returns a list of statements with traceback info.
 */
export function extractClaims(aiResponse: string, columns: string[], rows: Record<string, unknown>[]): VerifiedClaim[] {
  var claims: VerifiedClaim[] = [];
  
  // Simple heuristic: find "?" or numbers followed by currency symbols
  var moneyPattern = /\u00a5(\d+(?:[.,]\d+)?)/g;
  var match;
  var sampleRows = rows.slice(0, Math.min(rows.length, 50));
  
  while ((match = moneyPattern.exec(aiResponse)) !== null) {
    var claimedValue = parseFloat(match[1]);
    // Try to find this value in the data
    for (var ci = 0; ci < columns.length; ci++) {
      var col = columns[ci];
      for (var ri = 0; ri < sampleRows.length; ri++) {
        var rowVal = sampleRows[ri][col];
        if (rowVal !== undefined && rowVal !== null) {
          var numVal = parseFloat(String(rowVal));
          if (!isNaN(numVal) && Math.abs(numVal - claimedValue) < 0.01) {
            claims.push({
              claim: aiResponse.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30),
              evidence: [{ source: "data", row: ri, column: col, value: numVal }],
              calculation: "",
              sampleSize: 1,
              confidence: 0.9,
              verified: true,
              limitations: "Found matching value in row " + ri + ", column " + col,
            });
          }
        }
      }
    }
  }

  return claims.slice(0, 5);
}
