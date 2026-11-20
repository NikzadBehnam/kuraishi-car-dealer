import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const serverIconStub = `data:text/javascript,${encodeURIComponent(
  "export const Gauge=()=>null;export const Images=()=>null;export const Inbox=()=>null;export const Settings=()=>null;export const CarFront=()=>null;",
)}`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers" || specifier === "next/cache") {
    return nextResolve(`${specifier}.js`, context);
  }

  if (
    specifier === "lucide-react" &&
    context.conditions.includes("react-server")
  ) {
    return { url: serverIconStub, shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const sourcePath = resolvePath(
      process.cwd(),
      "src",
      `${specifier.slice(2)}.ts`,
    );
    return nextResolve(pathToFileURL(sourcePath).href, context);
  }

  return nextResolve(specifier, context);
}
