import { describe, expect, it } from "vitest";
import { countEmphasis, emphasisWords, parseEmphasis, plainEmphasis } from "./emphasis";

describe("parseEmphasis", () => {
  it("splits a headline into plain and serif segments", () => {
    expect(parseEmphasis("Küchen, auf den *Punkt*.")).toEqual([
      { text: "Küchen, auf den ", serif: false },
      { text: "Punkt", serif: true },
      { text: ".", serif: false }
    ]);
  });

  it("returns one plain segment when nothing is marked", () => {
    expect(parseEmphasis("Ohne Serife")).toEqual([{ text: "Ohne Serife", serif: false }]);
  });

  it("keeps a leading serif word", () => {
    expect(parseEmphasis("*Ihre* Küche")).toEqual([
      { text: "Ihre", serif: true },
      { text: " Küche", serif: false }
    ]);
  });
});

describe("plainEmphasis and countEmphasis", () => {
  it("strips markers and counts marked words", () => {
    expect(plainEmphasis("Ihre Küche. In *Ihrem* Bereich.")).toBe("Ihre Küche. In Ihrem Bereich.");
    expect(countEmphasis("Ihre Küche. In *Ihrem* Bereich.")).toBe(1);
    expect(countEmphasis("*Zwei* serife *Wörter*")).toBe(2);
    expect(countEmphasis("Keins")).toBe(0);
  });
});

describe("emphasisWords", () => {
  it("groups by whitespace and glues punctuation to a serif word", () => {
    expect(emphasisWords("in dem *gelebt* wird.")).toEqual([
      [{ text: "in", serif: false }],
      [{ text: "dem", serif: false }],
      [{ text: "gelebt", serif: true }],
      [{ text: "wird.", serif: false }]
    ]);
    expect(emphasisWords("den *Punkt*.")).toEqual([
      [{ text: "den", serif: false }],
      [
        { text: "Punkt", serif: true },
        { text: ".", serif: false }
      ]
    ]);
  });
});
