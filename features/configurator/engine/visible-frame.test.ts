import { Vector2, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  easeAxis,
  frameLens,
  frameRect,
  ShiftedLensCamera,
  UNCOVERED
} from "./visible-frame";

describe("frameRect", () => {
  it("is the whole canvas when nothing covers a 16:10 canvas", () => {
    expect(frameRect(1440, 900, UNCOVERED)).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  });

  it("sits left of the desktop Datenblatt, vertically centred", () => {
    const frame = frameRect(1440, 900, { top: 0, right: 440, bottom: 0 });
    expect(frame).toEqual({ x: 0, y: 137.5, width: 1000, height: 625 });
  });

  it("fills a phone's band between the controls and the sheet across its width", () => {
    // 390 × 844: the decisions end at 124 px, the camera row starts 440 px above the bottom.
    const frame = frameRect(390, 844, { top: 124, right: 0, bottom: 440 });
    expect(frame.width).toBe(390);
    expect(frame.height).toBeCloseTo(243.75);
    expect(frame.y + frame.height / 2).toBeCloseTo(124 + 280 / 2);
  });

  it("is centred across a band wider than 16:10", () => {
    const frame = frameRect(768, 1024, { top: 124, right: 0, bottom: 521 });
    expect(frame.height).toBeCloseTo(379);
    expect(frame.width).toBeCloseTo(606.4);
    expect(frame.x + frame.width / 2).toBeCloseTo(384);
  });

  it("keeps a fifth of each side however much is covered", () => {
    const frame = frameRect(844, 390, { top: 124, right: 0, bottom: 400 });
    expect(frame.height).toBeCloseTo(78);
    expect(frame.y).toBeGreaterThanOrEqual(0);
    expect(frame.y + frame.height).toBeLessThanOrEqual(390);
  });
});

describe("frameLens on a ShiftedLensCamera", () => {
  function cameraFor(width: number, height: number, covered = UNCOVERED, fov = 38) {
    const camera = new ShiftedLensCamera(fov, width / height, 0.08, 50);
    const lens = frameLens(width, height, frameRect(width, height, covered));
    camera.zoom = lens.zoom;
    camera.axis.copy(lens.axis);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return camera;
  }

  /** A point straight ahead, `up` along the frame's vertical half field of view. */
  function ahead(up = 0, fov = 38) {
    return new Vector3(0, 5 * Math.tan((fov * Math.PI) / 360) * up, -5);
  }

  it("matches the desktop framing left of the Datenblatt", () => {
    const share = 1000 / 1440;
    const camera = cameraFor(1440, 900, { top: 0, right: 440, bottom: 0 });
    expect(camera.zoom).toBeCloseTo(share);
    const axis = ahead().project(camera);
    expect(axis.x).toBeCloseTo(share - 1);
    expect(axis.y).toBeCloseTo(0);
    // The framing's top edge reaches the frame's top edge, at the share's height.
    expect(ahead(1).project(camera).y).toBeCloseTo(share);
  });

  it("draws a phone's framing into its band", () => {
    const camera = cameraFor(390, 844, { top: 124, right: 0, bottom: 440 }, 54);
    const toPixelY = (ndcY: number) => ((1 - ndcY) / 2) * 844;
    expect(toPixelY(ahead(0, 54).project(camera).y)).toBeCloseTo(264);
    expect(toPixelY(ahead(1, 54).project(camera).y)).toBeCloseTo(264 - 243.75 / 2);
    expect(toPixelY(ahead(-1, 54).project(camera).y)).toBeCloseTo(264 + 243.75 / 2);
  });

  it("keeps the shift under the temporal accumulation's jitter", () => {
    const camera = cameraFor(390, 844, { top: 124, right: 0, bottom: 440 });
    const before = ahead().project(camera).y;
    camera.setViewOffset(780, 1688, 0.25, -0.25, 780, 1688);
    expect(ahead().project(camera).y).toBeCloseTo(before, 3);
    camera.clearViewOffset();
    expect(ahead().project(camera).y).toBeCloseTo(before);
  });

  it("unprojects what it projects, so raycasting hits what is drawn", () => {
    const camera = cameraFor(390, 844, { top: 124, right: 0, bottom: 440 });
    const point = new Vector3(0.4, -0.3, -4);
    expect(point.clone().project(camera).unproject(camera).distanceTo(point)).toBeLessThan(1e-6);
  });
});

describe("easeAxis", () => {
  it("eases towards the frame's centre and lands on it", () => {
    const camera = new ShiftedLensCamera(38, 390 / 844, 0.08, 50);
    const target = new Vector2(0, 0.37);
    easeAxis(camera, target, 1 / 60, false);
    expect(camera.axis.y).toBeGreaterThan(0);
    expect(camera.axis.y).toBeLessThan(0.37);
    for (let frame = 0; frame < 240; frame += 1) easeAxis(camera, target, 1 / 60, false);
    expect(camera.axis.equals(target)).toBe(true);
  });

  it("jumps when asked to", () => {
    const camera = new ShiftedLensCamera(38, 1.6, 0.08, 50);
    easeAxis(camera, new Vector2(-0.3, 0), 1 / 60, true);
    expect(camera.axis.x).toBe(-0.3);
  });
});
