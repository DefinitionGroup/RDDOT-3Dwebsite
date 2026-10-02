import { Fragment } from "react";
import { parseEmphasis } from "@/lib/emphasis";

/**
 * Renders an editor headline, its `*marked*` word in the serif. A line break
 * the editor typed sets the desktop rhythm only; phones wrap freely, so it
 * becomes a space there.
 */
export function Emphasized({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && (
            <>
              <br className="hidden lg:block" />{" "}
            </>
          )}
          {parseEmphasis(line).map((segment, index) =>
            segment.serif ? <em key={index}>{segment.text}</em> : <Fragment key={index}>{segment.text}</Fragment>
          )}
        </Fragment>
      ))}
    </>
  );
}
