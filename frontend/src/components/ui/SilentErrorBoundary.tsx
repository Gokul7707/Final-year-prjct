import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Swallows render-time exceptions from optional/decorative subtrees (e.g. a
 * WebGL rig) so a driver failure never takes down the rest of the page.
 */
export class SilentErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('Decorative component failed to render:', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
