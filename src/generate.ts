#!/usr/bin/env bun
// @ts-nocheck
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const TEMPLATE_PLACEHOLDER = "{{MODEL_LINKS}}";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function toDisplayName(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return char;
    }
  });
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const templatePath = join(rootDir, "src", "index.template.html");
  const outputsDir = join(rootDir, "outputs");
  const distDir = join(rootDir, "dist");
  const distIndexPath = join(distDir, "index.html");
  const scriptSourcePath = join(rootDir, "src", "script.js");
  const distScriptPath = join(distDir, "script.js");

  const template = await readFile(templatePath, "utf8");
  await mkdir(distDir, { recursive: true });
  await cp(scriptSourcePath, distScriptPath);

  let entries;
  try {
    entries = await readdir(outputsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      await mkdir(distDir, { recursive: true });
      await writeFile(
        distIndexPath,
        template.replace(
          TEMPLATE_PLACEHOLDER,
          "            <p class=\"model-description\">No outputs found.</p>"
        ),
        "utf8"
      );
      console.warn("No outputs directory found. Generated placeholder index.");
      return;
    }
    throw error;
  }

  const modelLinks: string[] = [];

  await mkdir(distDir, { recursive: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const slug = entry.name;
    const modelRoot = join(outputsDir, slug);
    const modelDistDir = join(modelRoot, "dist");
    const distIndexPath = join(modelDistDir, "index.html");

    if (!(await pathExists(distIndexPath))) {
      try {
        await mkdir(modelDistDir, { recursive: true });
        await runBuild(modelRoot);
      } catch (error) {
        console.error(`Build failed for ${slug}:`, error);
        continue;
      }

      if (!(await pathExists(distIndexPath))) {
        console.warn(`Skipping ${slug}: build did not create dist/index.html.`);
        continue;
      }
    }

    const targetDir = join(distDir, slug);
    await rm(targetDir, { recursive: true, force: true });
    await cp(modelDistDir, targetDir, { recursive: true });

    let displayName = toDisplayName(slug);
    let modelName = displayName;
    const descriptionSections: string[] = [];
    const secondarySections: string[] = [];
    let toolName: string | null = null;
    let modeName: string | null = null;

    const infoPath = join(modelRoot, "info.json");
    if (await pathExists(infoPath)) {
      try {
        const infoRaw = await readFile(infoPath, "utf8");
        const info = JSON.parse(infoRaw) as {
          config?: {
            tool?: unknown;
            tool_mode?: unknown;
            model?: unknown;
            provider?: unknown;
          };
          results?: {
            time_taken?: unknown;
            dollar_cost?: unknown;
          };
        };

        const config = info?.config ?? {};
        const modelNameCandidate = pickString(config.model);
        const toolNameCandidate = pickString(config.tool);
        const modeNameCandidate = pickString(config.tool_mode);
        const providerName = pickString(config.provider);

        if (modelNameCandidate) {
          displayName = modelNameCandidate;
          modelName = modelNameCandidate;
        }
        if (toolNameCandidate) {
          toolName = toolNameCandidate;
          descriptionSections.push(`Tool: ${toolNameCandidate}`);
        }
        if (modeNameCandidate) {
          modeName = modeNameCandidate;
          descriptionSections.push(`Mode: ${modeNameCandidate}`);
        }
        if (providerName) {
          secondarySections.push(`Provider: ${providerName}`);
        }

        const results = info?.results ?? {};
        const timeTaken = pickString(results.time_taken);
        if (timeTaken) {
          secondarySections.push(`Run Time: ${timeTaken}`);
        }
        const dollarCost = pickString(results.dollar_cost);
        if (dollarCost) {
          secondarySections.push(`Cost: ${dollarCost}`);
        }
      } catch (error) {
        console.warn(`Could not read info.json for ${slug}:`, error);
      }
    }

    // Ensure modelName aligns with the final display name for analytics consistency
    modelName = modelName ?? displayName;

    const descriptionLines = [
      descriptionSections.length > 0
        ? descriptionSections.join(" | ")
        : "Elevator simulator implementation",
      ...secondarySections.map((section) => section),
    ].filter(Boolean);

    const descriptionHtml = descriptionLines
      .map((line) => `                <div class="model-description">${line}</div>`)
      .join("\n");

    const dataAttributes = [
      `data-model-name="${escapeHtmlAttr(modelName)}"`,
      toolName ? `data-tool-name="${escapeHtmlAttr(toolName)}"` : "",
      modeName ? `data-tool-mode="${escapeHtmlAttr(modeName)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const linkHtml = `            <a href="${slug}/" class="model-card" ${dataAttributes}>
                <div class="model-name">${displayName} <span class="arrow">→</span></div>
${descriptionHtml}
            </a>`;
    modelLinks.push(linkHtml);
  }

  const renderedLinks =
    modelLinks.length > 0
      ? modelLinks.join("\n              \n")
      : "            <p class=\"model-description\">No builds available.</p>";

  await writeFile(distIndexPath, template.replace(TEMPLATE_PLACEHOLDER, renderedLinks), "utf8");

  console.log(`Generated index.html with ${modelLinks.length} model links`);
}

async function runBuild(cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("bun", ["build", "./index.html", "--outdir", "dist"], {
      cwd,
      stdio: "inherit",
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`bun build exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
