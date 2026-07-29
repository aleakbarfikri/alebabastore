import React, { useMemo } from 'react';
import {
  Link as WouterLink,
  Redirect,
  Route as WouterRoute,
  Router,
  Switch,
  useLocation as useWouterLocation,
  useParams,
  useSearch,
} from 'wouter';

export const BrowserRouter = ({ children }) => <Router>{children}</Router>;
export const Routes = ({ children }) => <Switch>{children}</Switch>;

export const Route = ({ element, ...props }) => (
  <WouterRoute {...props}>{element}</WouterRoute>
);

export const Link = ({ to, children, ...props }) => (
  <WouterLink href={to} {...props}>{children}</WouterLink>
);

export const Navigate = ({ to, replace = false }) => <Redirect to={to} replace={replace} />;

export function useNavigate() {
  const [, navigate] = useWouterLocation();
  return navigate;
}

export function useLocation() {
  const [location] = useWouterLocation();
  return useMemo(() => ({
    pathname: location.split('?')[0] || '/',
    search: window.location.search,
  }), [location]);
}

export function useSearchParams() {
  const search = useSearch();
  const [location, navigate] = useWouterLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const setSearchParams = (next) => {
    const query = next instanceof URLSearchParams ? next.toString() : new URLSearchParams(next).toString();
    navigate(`${location.split('?')[0]}${query ? `?${query}` : ''}`);
  };
  return [params, setSearchParams];
}

export { useParams };
