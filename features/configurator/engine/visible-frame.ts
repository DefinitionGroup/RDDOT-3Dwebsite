import { MathUtils, PerspectiveCamera, Vector2 } from "three";

/**
 * The HUD covers parts of the canvas: on desktop the Datenblatt on the right,
 * on phones and tablets the controls above the scene and the sheet below it.
 * Every framing is composed for a 16:10 frame, so it is drawn into the largest
 * 16:10 rectangle the uncovered part holds, centred in it: the camera zooms
 * out to that rectangle's height and a lens shift moves the optical axis to
 * its centre. The camera stays where the framing put it, so orbiting,
 * raycasting and the rooms' walls behave as before.
 */
export const FRAME_ASPECT = 16 / 10;

/** CSS pixels of the canvas the HUD covers at each edge. */
export type CoveredEdges = { top: number; right: number; bottom: number };

export const UNCOVERED: CoveredEdges = { top: 0, right: 0, bottom: 0 };

/** However much is covered, the frame keeps at least this share of each side. */
const MIN_FREE_SHARE = 0.2;

export type FrameRect = { x: number; y: number; width: number; height: number };

/** Where the frame sits on a canvas of `width` × `height`, in the same units. */
export function frameRect(width: number, height: number, covered: CoveredEdges): FrameRect {
  const freeWidth = Math.max(width - covered.right, width * MIN_FREE_SHARE);
  const freeHeight = Math.max(height - covered.top - covered.bottom, height * MIN_FREE_SHARE);
  const top = Math.min(covered.top, height - freeHeight);
  const frameWidth = Math.min(freeWidth, freeHeight * FRAME_ASPECT);
  const frameHeight = frameWidth / FRAME_ASPECT;
  return {
    x: (freeWidth - frameWidth) / 2,
    y: top + (freeHeight - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight
  };
}

/**
 * The lens that draws the framing into `frame`: the zoom that fits the
 * framing's vertical field of view to the frame's height, and where the
 * optical axis lands, in normalized device coordinates.
 */
export function frameLens(width: number, height: number, frame: FrameRect) {
  if (width <= 0 || height <= 0) return { zoom: 1, axis: new Vector2() };
  return {
    zoom: frame.height / height,
    axis: new Vector2(
      ((frame.x + frame.width / 2) / width) * 2 - 1,
      1 - ((frame.y + frame.height / 2) / height) * 2
    )
  };
}

/**
 * A perspective camera whose optical axis can sit anywhere on the canvas.
 * three.js shifts its lens only sideways (filmOffset); the phone framing needs
 * it vertically too. The shift is applied last, after zoom and any view
 * offset, so the temporal accumulation's sub-pixel jitter keeps working.
 */
export class ShiftedLensCamera extends PerspectiveCamera {
  /** Where the optical axis lands, in normalized device coordinates. */
  readonly axis = new Vector2();

  override updateProjectionMatrix() {
    super.updateProjectionMatrix();
    // The base constructor calls this before `axis` exists.
    if (!this.axis || (this.axis.x === 0 && this.axis.y === 0)) return;
    const elements = this.projectionMatrix.elements;
    elements[8] -= this.axis.x;
    elements[9] -= this.axis.y;
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
}

/**
 * Moves the camera's axis towards `target`, eased like the controls' zoom
 * unless `immediate`.
 */
export function easeAxis(camera: ShiftedLensCamera, target: Vector2, delta: number, immediate: boolean) {
  const { axis } = camera;
  if (axis.equals(target)) return;
  if (immediate || axis.distanceTo(target) < 1e-4) {
    axis.copy(target);
  } else {
    axis.set(MathUtils.damp(axis.x, target.x, 5, delta), MathUtils.damp(axis.y, target.y, 5, delta));
  }
  camera.updateProjectionMatrix();
}
