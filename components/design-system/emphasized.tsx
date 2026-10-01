import { Fragment } from "react";
import { parseEmphasis } from "@/lib/emphasis";

/** Renders an editor headline, its `*marked*` word in the serif. */
export function Emphasized({ text }: { text: string }) {
  return (
    <>
      {parseEmphasis(text).map((segment, index) =>
        segment.serif ? <em key={index}>{segment.text}</em> : <Fragment key={index}>{segment.text}</Fragment>
      )}
    </>
  );
}
