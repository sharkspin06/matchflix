const POSTERS = [
  '/images/in the mood for love.jpg',
  '/images/chungking.jpg',
  '/images/happytogether.jpg',
  '/images/fallenangels.jpg',
];

/**
 * Full-screen cinematic background: a dim, slowly drifting wall of film posters with
 * a red glow at the top. Fixed behind the page; put it first inside a dark screen.
 */
export default function PosterBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#07090d]">
      <div className="auth-drift absolute -inset-[25%] grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 -rotate-[8deg] opacity-45">
        {Array.from({ length: 64 }, (_, i) => (
          <div
            key={i}
            className="aspect-[2/3] rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url("${encodeURI(POSTERS[(i + Math.floor(i / 4)) % POSTERS.length])}")` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#07090d]/60 via-[#07090d]/80 to-[#07090d]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.28),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.12),transparent_55%)]" />
      {/* Darker middle so text over the posters stays readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_center,rgba(7,9,13,0.75),transparent_100%)]" />
    </div>
  );
}
