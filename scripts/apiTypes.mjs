// Copies the API's types to api/officeSimulationApi.d.ts, the file hosts copy into their own source. It's the same
// file as src/officeSimulationApi.ts, which is types only.
import * as fs from "fs";

fs.mkdirSync("api", { recursive: true });
const source = fs.readFileSync("src/officeSimulationApi.ts", "utf8");
fs.writeFileSync("api/officeSimulationApi.d.ts", `// Generated from src/officeSimulationApi.ts by npm run build. Don't edit.\n${source}`);
