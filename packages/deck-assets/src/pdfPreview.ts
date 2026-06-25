import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./files";

export type PdfRenderer = {
  name: "pdftoppm";
  command: string;
  webpCommand: string | null;
};

export function detectPdfRenderer(): PdfRenderer | null {
  try {
    const command = execFileSync("which", ["pdftoppm"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    if (command) return { name: "pdftoppm", command, webpCommand: detectCommand("cwebp") };
  } catch {
    return null;
  }

  return null;
}

function detectCommand(name: string) {
  try {
    return execFileSync("which", [name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim() || null;
  } catch {
    return null;
  }
}

export function renderPdfPageToPng(
  renderer: PdfRenderer,
  pdfPath: string,
  pageNumber: number,
  outputPngPath: string,
  dpi: number
): { ok: boolean; width?: number; height?: number } {
  ensureDir(path.dirname(outputPngPath));
  const outputBase = outputPngPath.replace(/\.png$/i, "");
  if (fs.existsSync(outputPngPath)) fs.unlinkSync(outputPngPath);

  try {
    execFileSync(
      renderer.command,
      [
        "-r",
        String(dpi),
        "-png",
        "-f",
        String(pageNumber),
        "-l",
        String(pageNumber),
        "-singlefile",
        pdfPath,
        outputBase
      ],
      { stdio: "ignore" }
    );
  } catch {
    return { ok: false };
  }

  if (!fs.existsSync(outputPngPath)) return { ok: false };
  return { ok: true, ...readPngDimensions(outputPngPath) };
}

export function renderPdfPagePreview(
  renderer: PdfRenderer,
  pdfPath: string,
  pageNumber: number,
  outputPath: string,
  options: {
    targetHeight: number;
    format: "png" | "webp";
    webpQuality: number;
  }
): { ok: boolean; width?: number; height?: number; format?: "png" | "webp" } {
  ensureDir(path.dirname(outputPath));
  const outputBase = outputPath.replace(/\.(png|webp)$/i, "");
  const renderPngPath = options.format === "webp" ? `${outputBase}.tmp.png` : `${outputBase}.png`;
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  if (fs.existsSync(renderPngPath)) fs.unlinkSync(renderPngPath);

  try {
    execFileSync(
      renderer.command,
      [
        "-png",
        "-scale-to",
        String(options.targetHeight),
        "-f",
        String(pageNumber),
        "-l",
        String(pageNumber),
        "-singlefile",
        pdfPath,
        renderPngPath.replace(/\.png$/i, "")
      ],
      { stdio: "ignore" }
    );
  } catch {
    return { ok: false };
  }

  if (!fs.existsSync(renderPngPath)) return { ok: false };
  const dimensions = readPngDimensions(renderPngPath);

  if (options.format === "webp" && renderer.webpCommand) {
    try {
      execFileSync(
        renderer.webpCommand,
        ["-quiet", "-q", String(options.webpQuality), renderPngPath, "-o", outputPath],
        { stdio: "ignore" }
      );
      fs.unlinkSync(renderPngPath);
      return fs.existsSync(outputPath)
        ? { ok: true, ...dimensions, format: "webp" }
        : { ok: false };
    } catch {
      if (fs.existsSync(renderPngPath)) fs.unlinkSync(renderPngPath);
      return { ok: false };
    }
  }

  if (renderPngPath !== outputPath) fs.renameSync(renderPngPath, outputPath);
  return { ok: true, ...dimensions, format: "png" };
}

export function browserPathForPublicDeckFile(outRoot: string, filePath: string) {
  const rel = path.relative(outRoot, filePath).split(path.sep).join("/");
  return `deck/${rel}`;
}

function readPngDimensions(filePath: string): { width?: number; height?: number } {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return {};
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}
