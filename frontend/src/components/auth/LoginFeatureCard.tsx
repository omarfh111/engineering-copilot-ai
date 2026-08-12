import type { LucideIcon } from 'lucide-react';

interface LoginFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function LoginFeatureCard({ icon: Icon, title, description }: LoginFeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-brand-300/40 hover:bg-white/[0.11] hover:shadow-[0_18px_45px_-28px_rgba(96,165,250,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.12),_transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 group-hover:border-brand-200/30 group-hover:bg-brand-400/10">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="relative mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
