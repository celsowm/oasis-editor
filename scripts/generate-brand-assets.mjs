import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const sourceDir = resolve(repoRoot, "branding", "source");
const generatedDir = resolve(repoRoot, "branding", "generated");
const publicBrandingDir = resolve(repoRoot, "public", "branding");

const fullLogoSvg = resolve(sourceDir, "oasis-icon.svg");

const requiredFiles = [fullLogoSvg];
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing required brand source: ${file}`);
  }
}

mkdirSync(generatedDir, { recursive: true });
mkdirSync(publicBrandingDir, { recursive: true });

const wipeDirectory = (directory) => {
  if (!existsSync(directory)) return;
  for (const entry of ["apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png", "favicon.ico", "github-pages-icon.png", "icon-192.png", "icon-512.png", "logo-full.png", "logo-mark-square.png", "social-card.png"]) {
    rmSync(resolve(directory, entry), { force: true });
  }
};

wipeDirectory(generatedDir);
wipeDirectory(publicBrandingDir);

function runMagick(args) {
  const result = spawnSync("magick", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(`magick ${args.join(" ")}\n${result.stderr || result.stdout}`);
  }
}

const output = (name) => resolve(generatedDir, name);

runMagick([fullLogoSvg, "-background", "none", "-resize", "1024x1024", output("logo-full.png")]);
runMagick([fullLogoSvg, "-background", "none", "-resize", "512x512", output("logo-mark-square.png")]);

runMagick([output("logo-mark-square.png"), "-filter", "Lanczos", "-resize", "16x16", output("favicon-16x16.png")]);
runMagick([output("logo-mark-square.png"), "-filter", "Lanczos", "-resize", "32x32", output("favicon-32x32.png")]);
runMagick([output("logo-mark-square.png"), "-filter", "Lanczos", "-resize", "180x180", output("apple-touch-icon.png")]);
runMagick([output("logo-mark-square.png"), "-filter", "Lanczos", "-resize", "192x192", output("icon-192.png")]);
runMagick([output("logo-mark-square.png"), "-filter", "Lanczos", "-resize", "512x512", output("icon-512.png")]);
cpSync(output("logo-mark-square.png"), output("github-pages-icon.png"));
runMagick([
  fullLogoSvg,
  "-background",
  "none",
  "-define",
  "icon:auto-resize=16,32,48",
  output("favicon.ico"),
]);

runMagick([
  "-size",
  "1280x640",
  "xc:#fffdf7",
  "-fill",
  "#f5e4cd",
  "-draw",
  "roundrectangle 48,48 1232,592 56,56",
  "-fill",
  "#fffdf7",
  "-draw",
  "roundrectangle 76,76 1204,564 48,48",
  "(",
  output("logo-mark-square.png"),
  "-resize",
  "156x208",
  ")",
  "-gravity",
  "NorthWest",
  "-geometry",
  "+110+72",
  "-composite",
  "(",
  output("logo-full.png"),
  "-resize",
  "420x560",
  ")",
  "-gravity",
  "East",
  "-geometry",
  "+88+0",
  "-composite",
  "-fill",
  "#2f5f5b",
  "-font",
  "Segoe-UI-Bold",
  "-pointsize",
  "78",
  "-gravity",
  "NorthWest",
  "-annotate",
  "+92+218",
  "Oasis Editor",
  "-fill",
  "#57716b",
  "-font",
  "Segoe-UI",
  "-pointsize",
  "32",
  "-annotate",
  "+94+306",
  "Document editor, demo, API, and plugins.",
  "-fill",
  "#8dbcb5",
  "-draw",
  "roundrectangle 92,388 598,448 22,22",
  "-fill",
  "#fffdf7",
  "-font",
  "Segoe-UI-Semibold",
  "-pointsize",
  "28",
  "-annotate",
  "+120+397",
  "GitHub Pages • npm • favicon • docs",
  output("social-card.png"),
]);

for (const file of [
  "apple-touch-icon.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon.ico",
  "github-pages-icon.png",
  "icon-192.png",
  "icon-512.png",
  "logo-full.png",
  "logo-mark-square.png",
  "social-card.png",
]) {
  cpSync(resolve(generatedDir, file), resolve(publicBrandingDir, file));
}
