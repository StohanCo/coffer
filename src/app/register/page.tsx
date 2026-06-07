import AuthCard from "@/components/AuthCard";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
            <span className="text-2xl font-bold text-white">F</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-400">Start tracking your finances privately</p>
        </div>
        <div className="card p-7">
          <AuthCard mode="register" />
        </div>
        <p className="mt-6 text-center text-[11px] text-slate-600">
          Self-hosted · your data never leaves your server
        </p>
      </div>
    </div>
  );
}
