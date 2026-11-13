// Every page a learner can open. The viewer is one static page, so each tab is one route.
// The audit serves the world folder itself: see AUDIT_SERVER in scripts/text-audit.ts.
export type Route = { name: string; path: string };

export const routes: Route[] = [
  { name: "viewer: meet", path: "/viewer.html#meet" },
  { name: "viewer: read the drafts", path: "/viewer.html#read/T004" },
  { name: "viewer: chart your counts", path: "/viewer.html#chart" },
  { name: "viewer: your goal", path: "/viewer.html#goal" },
];

// The tab names are written into the course pages, so they stay as they are.
export const extraButtonVerbs: string[] = ["meet", "chart", "your"];
