/**
 * A marquee on CSS keyframes: the track is rendered twice and slides by half
 * its width, so the loop is seamless. Pauses on hover; reduced motion leaves
 * it standing.
 */
export function Ticker({ items }: { items: string[] }) {
  const track = (hidden: boolean) => (
    <ul
      aria-hidden={hidden}
      className="m-0 flex shrink-0 list-none items-center gap-10 p-0 pr-10"
    >
      {items.map((item) => (
        <li className="flex items-center gap-10 whitespace-nowrap text-nav text-graphite" key={item}>
          <span aria-hidden="true" className="size-1.5 rounded-pill bg-signature" />
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group overflow-hidden border-y border-hairline py-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused]">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
