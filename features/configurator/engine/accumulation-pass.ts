import { CopyMaterial, Pass } from "postprocessing";
import {
  HalfFloatType,
  ShaderMaterial,
  Uniform,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer
} from "three";

/**
 * Progressive supersampling for a scene that mostly stands still.
 *
 * Each frame the camera is jittered by a sub-pixel offset (see
 * TemporalAccumulation) and this pass blends the new frame into a history
 * buffer with weight 1/n. After a few dozen frames the image equals a
 * many-sample supersampled render: edges, thin handles and ambient
 * occlusion converge with no shimmer. Any camera or scene change resets n.
 */
class BlendMaterial extends ShaderMaterial {
  constructor() {
    super({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        history: new Uniform<Texture | null>(null),
        weight: new Uniform(1)
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 1.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D inputBuffer;
        uniform sampler2D history;
        uniform float weight;
        varying vec2 vUv;
        void main() {
          gl_FragColor = mix(texture2D(history, vUv), texture2D(inputBuffer, vUv), weight);
        }
      `
    });
  }
}

export class AccumulationPass extends Pass {
  readonly maxSamples: number;
  /** Frames accumulated since the last reset. */
  sample = 0;

  private readonly history: [WebGLRenderTarget, WebGLRenderTarget];
  private index = 0;
  private readonly blend = new BlendMaterial();
  private readonly copy = new CopyMaterial();

  constructor(maxSamples = 32) {
    super("AccumulationPass");
    this.maxSamples = maxSamples;
    this.needsSwap = true;
    const options = { depthBuffer: false, stencilBuffer: false, type: HalfFloatType };
    this.history = [new WebGLRenderTarget(1, 1, options), new WebGLRenderTarget(1, 1, options)];
  }

  get converged() {
    return this.sample >= this.maxSamples;
  }

  reset() {
    this.sample = 0;
  }

  override setSize(width: number, height: number) {
    for (const target of this.history) target.setSize(width, height);
    this.reset();
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    outputBuffer: WebGLRenderTarget
  ) {
    const previous = this.history[this.index];
    const next = this.history[1 - this.index];
    const weight = this.sample === 0 ? 1 : 1 / Math.min(this.sample + 1, this.maxSamples);

    this.blend.uniforms.inputBuffer.value = inputBuffer.texture;
    this.blend.uniforms.history.value = previous.texture;
    this.blend.uniforms.weight.value = weight;
    this.fullscreenMaterial = this.blend;
    renderer.setRenderTarget(next);
    renderer.render(this.scene, this.camera);

    this.copy.inputBuffer = next.texture;
    this.fullscreenMaterial = this.copy;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);

    this.index = 1 - this.index;
    if (this.sample < this.maxSamples) this.sample += 1;
  }

  override dispose() {
    super.dispose();
    for (const target of this.history) target.dispose();
    this.blend.dispose();
    this.copy.dispose();
  }
}
