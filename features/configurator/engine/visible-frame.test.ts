import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { frameRect, lensShift, visibleShare } from "./visible-frame";

describe("visibleShare", () => {
  it("is the uncovered share of the width, 1 without a panel", () => {
    expect(visibleShare(1440, 440)).toBeCloseTo(1000 / 1440);
    expect(visibleShare(1440, 0)).toBe(1);
    expect(visibleShare(0, 440)).toBe(1);
    expect(visibleShare(500, 440)).toBe(0.4);
  });
});

describe("lensShift", () => {
  // A desktop canvas, the studio lens, a point on the optical axis and one on
  // the frame's right edge as the unshifted camera saw them.
  const aspect = 1440 / 900;
  const share = visibleShare(1440, 440);

  function project(point: Vector3, shifted: boolean) {
    const camera = new PerspectiveCamera(38, aspect, 0.08, 50);
    if (shifted) {
      camera.zoom = share;
      camera.filmOffset = lensShift(camera, share);
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return point.clone().project(camera);
  }

  it("puts the optical axis in the middle of the visible part", () => {
    const axis = project(new Vector3(0, 0, -5), true);
    // NDC: the visible part spans -1 … 2·share − 1, its middle is share − 1.
    expect(axis.x).toBeCloseTo(share - 1);
    expect(axis.y).toBeCloseTo(0);
  });

  it("draws the whole frame into the visible part, scaled by its share", () => {
    const edge = new Vector3(0, 0, -5);
    const unshifted = project(edge, false);
    expect(unshifted.x).toBeCloseTo(0);
    const right = new Vector3(5 * Math.tan((38 * Math.PI) / 360) * aspect, 0, -5);
    expect(project(right, false).x).toBeCloseTo(1);
    expect(project(right, true).x).toBeCloseTo(2 * share - 1);
    const top = new Vector3(0, 5 * Math.tan((38 * Math.PI) / 360), -5);
    expect(project(top, true).y).toBeCloseTo(share);
  });

  it("does nothing without a panel", () => {
    expect(lensShift(new PerspectiveCamera(38, aspect), 1)).toBe(0);
  });
});

describe("frameRect", () => {
  it("is the left share of the canvas, vertically centred, at its aspect", () => {
    const rect = frameRect(2880, 1800, 0.5);
    expect(rect).toEqual({ x: 0, y: 450, width: 1440, height: 900 });
    expect(rect.width / rect.height).toBeCloseTo(2880 / 1800);
  });
});
