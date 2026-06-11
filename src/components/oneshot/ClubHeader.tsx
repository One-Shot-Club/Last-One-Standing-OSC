export function ClubHeader({ clubName, logoUrl }: { clubName: string; logoUrl?: string | null }) {
  return (
    <div className="flex flex-col items-center text-center">
      {logoUrl && (
        <img
          src={logoUrl}
          alt={`${clubName} logo`}
          className="mb-2 h-16 w-16 rounded-md bg-background/40 object-contain p-1"
        />
      )}
      <h2 className="display mt-2 text-2xl tracking-wide">{clubName}</h2>
      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Powered by <span className="text-primary">OneShotClub</span>
      </p>
    </div>
  );
}
