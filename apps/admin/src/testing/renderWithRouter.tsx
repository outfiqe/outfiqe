import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AnyRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

type RenderWithRouterOptions = {
  path?: string;
  initialEntry?: string;
};

type RenderWithRouterResult = RenderResult & { router: AnyRouter };

export const renderWithRouter = (
  ui: ReactElement,
  { path = "/", initialEntry }: RenderWithRouterOptions = {},
): RenderWithRouterResult => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const rootRoute = createRootRoute({
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => ui,
  });
  const pageRoute = createRoute({ getParentRoute: () => rootRoute, path });

  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry ?? path] }),
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...result, router };
};
