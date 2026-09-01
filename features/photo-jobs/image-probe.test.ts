import { describe, expect, it } from "vitest";
import { probeImage } from "@/features/photo-jobs/image-probe";

/** Minimal but structurally real headers, built rather than fixture-loaded. */
function jpeg(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, // APP0, length 16
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, precision 8
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9 // EOI
  ]);
}

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

describe("probeImage", () => {
  it("reads JPEG dimensions from the frame header", () => {
    expect(probeImage(jpeg(1280, 720))).toEqual({
      contentType: "image/jpeg",
      width: 1280,
      height: 720
    });
  });

  it("reads PNG dimensions from IHDR", () => {
    expect(probeImage(png(1920, 1080))).toEqual({
      contentType: "image/png",
      width: 1920,
      height: 1080
    });
  });

  it("skips application segments before the frame header", () => {
    // The APP0 block above must not be mistaken for a frame.
    expect(probeImage(jpeg(640, 480))?.width).toBe(640);
  });

  it("rejects bytes that are not an image", () => {
    expect(probeImage(new TextEncoder().encode("not an image at all"))).toBeNull();
  });

  it("rejects a file whose extension lies about its content", () => {
    // PNG signature with a JPEG-ish tail: still a PNG, never a JPEG.
    expect(probeImage(png(10, 10))?.contentType).toBe("image/png");
  });

  it("rejects a truncated header rather than guessing", () => {
    expect(probeImage(jpeg(1280, 720).slice(0, 6))).toBeNull();
    expect(probeImage(png(1920, 1080).slice(0, 12))).toBeNull();
  });

  it("rejects zero dimensions", () => {
    expect(probeImage(png(0, 0))).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(probeImage(new Uint8Array(0))).toBeNull();
  });
});
