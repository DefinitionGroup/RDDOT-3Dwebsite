import { MathUtils, type PerspectiveCamera } from "three";

/**
 * On desktop the Datenblatt covers the right of the canvas. Every framing is
 * composed for the whole canvas, so it is drawn into the part left of the
 * panel instead: the camera zooms out to the visible share of the width and a
 * horizontal lens shift centres the frame there. The camera stays where the
 * framing put it, so orbiting, raycasting and the rooms' walls behave as before.
 */

/** Share of the canvas width the frame is drawn into: 1 without a panel. */
export function visibleShare(canvasWidth: number, coveredRight: number) {
  if (canvasWidth <= 0 || coveredRight <= 0) return 1;
  return MathUtils.clamp((canvasWidth - coveredRight) / canvasWidth, 0.4, 1);
}

/**
 * The film offset (PerspectiveCamera.filmOffset, in the film gauge's mm) that
 * moves the optical axis to the centre of the left `share` of the canvas.
 * three.js applies it on top of a view offset, so the temporal accumulation's
 * sub-pixel jitter keeps working.
 */
export function lensShift(camera: Pick<PerspectiveCamera, "aspect" | "fov" | "zoom" | "getFilmWidth">, share: number) {
  if (share >= 1) return 0;
  return (Math.tan(MathUtils.DEG2RAD * camera.fov * 0.5) * camera.aspect * camera.getFilmWidth() * (1 - share)) / camera.zoom;
}

/**
 * Where the frame sits on a canvas of `width` × `height` pixels: the left
 * `share` of the width, vertically centred, at the canvas's aspect ratio.
 */
export function frameRect(width: number, height: number, share: number) {
  return { x: 0, y: (height * (1 - share)) / 2, width: width * share, height: height * share };
}
