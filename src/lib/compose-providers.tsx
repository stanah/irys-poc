import { type ComponentType, type PropsWithChildren } from 'react';

type Provider = ComponentType<PropsWithChildren>;

export function composeProviders(providers: Provider[]): Provider {
  return providers.reduce(
    (Accumulated, Current) =>
      function ComposedProvider({ children }: PropsWithChildren) {
        return (
          <Accumulated>
            <Current>{children}</Current>
          </Accumulated>
        );
      },
    ({ children }: PropsWithChildren) => <>{children}</>,
  );
}
