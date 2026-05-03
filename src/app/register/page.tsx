import AuthCard from "@/components/AuthCard";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-brand-surface p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <span className="text-xl font-bold text-white">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">FinOps Local</h1>
          <p className="mt-2 text-sm text-slate-400">Create your account</p>
        </div>
        <AuthCard mode="register" />
      </div>
    </div>
  );
}
