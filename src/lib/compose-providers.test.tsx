import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { composeProviders } from './compose-providers';
import type { PropsWithChildren } from 'react';

// Simple test providers
function ProviderA({ children }: PropsWithChildren) {
  return <div data-testid="provider-a">{children}</div>;
}

function ProviderB({ children }: PropsWithChildren) {
  return <div data-testid="provider-b">{children}</div>;
}

function ProviderC({ children }: PropsWithChildren) {
  return <div data-testid="provider-c">{children}</div>;
}

describe('composeProviders', () => {
  it('should render children through a single provider', () => {
    const Composed = composeProviders([ProviderA]);
    render(
      <Composed>
        <span data-testid="child">Hello</span>
      </Composed>
    );

    expect(screen.getByTestId('provider-a')).toBeDefined();
    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('should nest multiple providers in order', () => {
    const Composed = composeProviders([ProviderA, ProviderB, ProviderC]);
    const { container } = render(
      <Composed>
        <span>Content</span>
      </Composed>
    );

    // ProviderA should be the outermost wrapper
    const providerA = screen.getByTestId('provider-a');
    const providerB = screen.getByTestId('provider-b');
    const providerC = screen.getByTestId('provider-c');

    expect(providerA).toBeDefined();
    expect(providerB).toBeDefined();
    expect(providerC).toBeDefined();

    // ProviderB should be inside ProviderA
    expect(providerA.contains(providerB)).toBe(true);
    // ProviderC should be inside ProviderB
    expect(providerB.contains(providerC)).toBe(true);
  });

  it('should render children when no providers are given', () => {
    const Composed = composeProviders([]);
    render(
      <Composed>
        <span data-testid="child">Alone</span>
      </Composed>
    );

    expect(screen.getByText('Alone')).toBeDefined();
  });
});
