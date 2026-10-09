import { Spinner } from './Spinner';

// Shown while a lazy route chunk downloads. Every route in routes.tsx is lazy,
// so without this the router renders null on a cold visit — a blank white page
// until the chunk lands, and a React Router "No `HydrateFallback` element
// provided" warning. Painting the themed background keeps first paint on-brand,
// which matters most on `/` where it's a first impression.
//
// Lives here rather than in routes.tsx because that file exports `router`, and
// mixing a component into a module with non-component exports trips
// react(only-export-components) and breaks fast refresh.
export function RouteFallback() {
  return (
    <div className="min-h-svh grid place-items-center bg-page">
      <Spinner />
    </div>
  );
}
