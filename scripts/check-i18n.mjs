// Fails if a translation key used in src/ is missing, or if en.json and ar.json drift apart.
// Run: npm run i18n:check
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src", import.meta.url));

const flatten = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([key, value]) =>
        typeof value === "object" && value !== null
            ? flatten(value, `${prefix}${key}.`)
            : [`${prefix}${key}`],
    );

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === "locales" ? [] : walk(path);
        return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });

const en = JSON.parse(readFileSync(join(root, "locales/en.json"), "utf8"));
const ar = JSON.parse(readFileSync(join(root, "locales/ar.json"), "utf8"));
// i18next plural forms (key_one, key_other, ...) all count as the base key
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, "");
const enKeys = new Set(flatten(en).map(base));
const arKeys = new Set(flatten(ar).map(base));

// any string literal that looks like  namespace.key  for our namespaces
const KEY = /["'`]((?:common|nav|lang|auth|home|room|timer|tasks|stats|validation|errors)\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)["'`]/g;
const used = new Set();
for (const file of walk(root)) {
    for (const match of readFileSync(file, "utf8").matchAll(KEY)) used.add(match[1]);
}

let failed = false;
const report = (title, list) => {
    if (list.length === 0) return;
    failed = true;
    console.error(`\n${title}`);
    for (const item of list.sort()) console.error(`  - ${item}`);
};

report("Used in code but missing from en.json:", [...used].filter((k) => !enKeys.has(k)));
report("Used in code but missing from ar.json:", [...used].filter((k) => !arKeys.has(k)));
report("In en.json but not in ar.json:", [...enKeys].filter((k) => !arKeys.has(k)));
report("In ar.json but not in en.json:", [...arKeys].filter((k) => !enKeys.has(k)));
report("In en.json but never used (dead key):", [...enKeys].filter((k) => !used.has(k)));

if (failed) process.exit(1);
console.log(`i18n OK: ${enKeys.size} keys, ${used.size} used, en and ar match.`);
