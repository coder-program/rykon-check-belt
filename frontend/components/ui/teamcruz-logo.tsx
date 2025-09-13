import Image from "next/image";

export function TeamCruzLogo({ size = 120 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <Image
          src="/imgs/teamcruz.png"
          alt="Team Cruz Brazilian Jiu-Jitsu"
          width={size}
          height={size}
          className="rounded-full shadow-2xl border-4 border-white/20 hover:border-red-500/30 transition-all duration-300"
          priority
        />
        {/* Efeito de brilho */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
