import { cp, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";

const web = fileURLToPath(new URL("../", import.meta.url));
const target = path.join(web, ".next/standalone/apps/web");
await access(path.join(target, "server.js"));
// Next's standalone output omits static/public assets. Copy only these known
// application asset directories into its generated output tree.
await mkdir(path.join(target, ".next"), { recursive: true });
await cp(path.join(web, ".next/static"), path.join(target, ".next/static"), { recursive: true });
try {
  await access(path.join(web, "public"));
  await cp(path.join(web, "public"), path.join(target, "public"), { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const child = spawn(process.execPath, [path.join(target, "server.js")], {
  cwd: target,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "3000",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
