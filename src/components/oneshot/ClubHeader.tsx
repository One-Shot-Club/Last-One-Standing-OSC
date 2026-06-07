export function ClubHeader({ clubName }: { clubName: string; logoUrl?: string | null }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="display mt-2 text-2xl tracking-wide">{clubName}</h2>
      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Powered by <span className="text-primary">OneShotClub</span>
      </p>
    </div>
  );
}

