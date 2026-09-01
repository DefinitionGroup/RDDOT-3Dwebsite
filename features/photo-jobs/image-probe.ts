/**
 * Reads image dimensions straight from the bytes. Both a Source Capture (which
 * arrives from a browser) and a Generated Photo (which arrives from a provider)
 * are untrusted input under ADR 0008: neither may declare its own size. Parsing
 * the header is also how a file claiming to be a JPEG is caught not being one.
 */

export type ProbedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

export function probeImage(bytes: Uint8Array): ProbedImage | null {
  return probeJpeg(bytes) ?? probePng(bytes) ?? probeWebp(bytes);
}

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function probeJpeg(bytes: Uint8Array): ProbedImage | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];

    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Start of scan: entropy-coded data follows, no dimensions beyond here.
    if (marker === 0xda) return null;

    const length = readUint16BE(bytes, offset + 2);
    if (length < 2) return null;

    // SOF0..SOF15, excluding the non-frame markers DHT (c4), JPGA (c8), DAC (cc).
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      const height = readUint16BE(bytes, offset + 5);
      const width = readUint16BE(bytes, offset + 7);
      if (width <= 0 || height <= 0) return null;
      return { contentType: "image/jpeg", width, height };
    }

    offset += 2 + length;
  }

  return null;
}

function probePng(bytes: Uint8Array): ProbedImage | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) return null;
  if (!signature.every((value, index) => bytes[index] === value)) return null;
  // The IHDR chunk is required to be first.
  if (
    bytes[12] !== 0x49 ||
    bytes[13] !== 0x48 ||
    bytes[14] !== 0x44 ||
    bytes[15] !== 0x52
  ) {
    return null;
  }

  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
  if (width <= 0 || height <= 0) return null;
  return { contentType: "image/png", width, height };
}

function probeWebp(bytes: Uint8Array): ProbedImage | null {
  if (bytes.length < 30) return null;
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isRiff || !isWebp) return null;

  const format = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (format === "VP8 ") {
    // Lossy: 14-bit little-endian dimensions follow the 3-byte start code.
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    if (width <= 0 || height <= 0) return null;
    return { contentType: "image/webp", width, height };
  }

  if (format === "VP8L") {
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return {
      contentType: "image/webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  if (format === "VP8X") {
    return {
      contentType: "image/webp",
      width: (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1,
      height: (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1
    };
  }

  return null;
}
