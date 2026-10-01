"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps one failing block from taking the page down: the block disappears and
 * the error is logged. Studio validation is the real guard (ADR 0007: invalid
 * blocks cannot be published); this only covers what slips past it.
 */
export class BlockBoundary extends Component<{ blockType: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Page Block "${this.props.blockType}" failed to render`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
