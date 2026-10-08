import { cp, mkdir } from "node:fs/promises";

const source = new URL("../../../public/assets/", import.meta.url);
const destination = new URL("../public/assets/", import.meta.url);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log("Copied public document fixtures into the Next.js example.");
