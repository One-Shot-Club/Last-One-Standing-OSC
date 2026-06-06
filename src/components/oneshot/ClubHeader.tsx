import crest from "@/assets/killeshin-crest.png.asset.json";

export function ClubHeader({ clubName, logoUrl }: { clubName: string; logoUrl?: string | null }) {
  const src = logoUrl || crest.url;
  return (
    <div className="flex flex-col items-center text-center">
      <img src={src} alt={`${clubName} crest`} className="h-20 w-20 object-contain" />
      <h2 className="display mt-2 text-2xl tracking-wide">{clubName}</h2>
      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Powered by <span className="text-primary">OneShotClub</span>
      </p>
    </div>
  );
}
