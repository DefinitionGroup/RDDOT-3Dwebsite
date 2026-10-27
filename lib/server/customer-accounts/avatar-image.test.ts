import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";
import { processAvatar } from "./avatar-image";

function picture(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#b07a4a" } });
}

async function bytesOf(image: Sharp) {
  return new Uint8Array(await image.toBuffer());
}

describe("processAvatar", () => {
  it("stores a square WebP of at most 512 px from a large picture", async () => {
    const result = await processAvatar(await bytesOf(picture(2000, 1200).png()));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const stored = await sharp(result.bytes).metadata();
    expect([stored.format, stored.width, stored.height, result.edge]).toEqual(["webp", 512, 512, 512]);
  });

  it("drops EXIF, including a phone's GPS position", async () => {
    const input = await bytesOf(
      picture(1200, 900)
        .jpeg()
        .withExif({
          IFD0: { Make: "Phone", Copyright: "Anna Weber" },
          IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 31/1 12/1" }
        })
    );
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const result = await processAvatar(input);
    if (result.kind !== "ok") throw new Error(result.kind);
    const stored = await sharp(result.bytes).metadata();
    expect(stored.exif).toBeUndefined();
    expect(stored.xmp).toBeUndefined();
  });

  it("turns the picture upright first and never enlarges it", async () => {
    // Stored 300 × 300, dark left half, light right half, tagged "rotate 90° clockwise":
    // upright, the dark half is on top.
    const halves = Buffer.from(
      "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
        "<rect width='150' height='300' fill='#202020'/><rect x='150' width='150' height='300' fill='#f0f0f0'/></svg>"
    );
    const input = await bytesOf(sharp(halves).jpeg().withMetadata({ orientation: 6 }));
    const result = await processAvatar(input);
    if (result.kind !== "ok") throw new Error(result.kind);
    expect(result.edge).toBe(300);
    const { data, info } = await sharp(result.bytes).raw().toBuffer({ resolveWithObject: true });
    const brightness = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    expect([info.width, info.height]).toEqual([300, 300]);
    expect(brightness(150, 40)).toBeLessThan(80);
    expect(brightness(150, 260)).toBeGreaterThan(200);
    expect((await sharp(result.bytes).metadata()).orientation).toBeUndefined();
  });

  it("refuses small pictures, other formats and anything that is not a picture", async () => {
    expect((await processAvatar(await bytesOf(picture(150, 900).jpeg()))).kind).toBe("too-small");
    expect((await processAvatar(await bytesOf(picture(400, 400).gif()))).kind).toBe("not-an-image");
    expect((await processAvatar(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).kind).toBe(
      "not-an-image"
    );
    expect((await processAvatar(new Uint8Array([1, 2, 3, 4, 5]))).kind).toBe("not-an-image");
  });
});
