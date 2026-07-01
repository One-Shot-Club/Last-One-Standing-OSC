/** Marketing routes that show the global OneShotClub site header. */
const MARKETING_PATHS = [
  "/",
  "/signup",
  "/pricing",
  "/case-studies",
  "/last-man-standing",
  "/login",
  "/dev/login",
] as const;

export function shouldShowSiteHeader(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_PATHS.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}
