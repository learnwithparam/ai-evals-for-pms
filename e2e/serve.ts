// Serves the world folder so the text audit can open viewer.html without any other app running.
import { join } from "node:path";

const port = Number(process.argv[2]);
const worldFolder = join(import.meta.dir, "..", "world");

Bun.serve({
  port,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const filePath = join(worldFolder, pathname === "/" ? "viewer.html" : pathname);
    if (!filePath.startsWith(worldFolder)) {
      return new Response("Not found", { status: 404 });
    }
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});
