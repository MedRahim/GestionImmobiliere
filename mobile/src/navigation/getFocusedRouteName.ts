import {NavigationState, PartialState} from '@react-navigation/native';

export function getFocusedRouteName(
  state?: NavigationState | PartialState<NavigationState> | null,
): string | undefined {
  if (!state?.routes?.length) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return undefined;
  if (route.state) {
    return getFocusedRouteName(route.state) ?? route.name;
  }
  return route.name;
}
