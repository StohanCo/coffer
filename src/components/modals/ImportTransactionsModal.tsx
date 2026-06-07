"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Skeleton";
import { Modal, primaryCls, secondaryCls } from "./AddAccountModal";

type Result = { imported: number; skipped: number; errors: string[]; totalErrors: number };

export default function ImportTransactionsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(`Import failed (server returned ${res.status}).`);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title="Import transactions" onClose={onClose}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {!result ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 py-8 text-sm text-slate-400 transition-colors hover:border-emerald-600/60 hover:text-emerald-300 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {uploading ? <Spinner className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
            {uploading ? "Importing…" : "Choose a CSV file"}
          </button>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
            <p className="mb-1 font-medium text-slate-400">Expected columns</p>
            <p className="font-mono text-[11px] text-slate-500">Date, Type, Amount, Currency, Description, Category, Account, Notes</p>
            <p className="mt-2">
              Rows are matched to accounts by name (must already exist). Transfers are skipped.
              Tip: export first to get the exact format.
            </p>
          </div>

          {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-800/40 bg-emerald-900/15 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <p className="text-sm text-slate-200">
              Imported <span className="font-semibold text-emerald-300">{result.imported}</span>
              {result.skipped > 0 && <> · skipped <span className="font-semibold text-amber-300">{result.skipped}</span></>}
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {result.totalErrors} row{result.totalErrors !== 1 ? "s" : ""} skipped
              </div>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-slate-500">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                {result.totalErrors > result.errors.length && <li>…and {result.totalErrors - result.errors.length} more</li>}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={primaryCls.replace("flex-1", "")}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
