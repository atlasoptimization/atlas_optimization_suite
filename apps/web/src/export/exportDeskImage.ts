export async function exportDeskAsPng(element: HTMLElement, filename: string): Promise<void> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const styles = collectDocumentStyles();
  const clone = element.cloneNode(true) as HTMLElement;
  const pixelRatio = Math.min(3, Math.max(2, window.devicePixelRatio || 1));

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  await inlineSameOriginImages(clone);

  const html = `
    <style>${styles}</style>
    ${new XMLSerializer().serializeToString(clone)}
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="${width}" height="${height}">${html}</foreignObject>
    </svg>
  `;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create image export canvas.");

    context.scale(pixelRatio, pixelRatio);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await canvasToBlob(canvas);
    downloadBlob(pngBlob, filename);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function inlineSameOriginImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      const src = image.getAttribute("src");
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      try {
        const url = new URL(src, window.location.href);
        if (url.origin !== window.location.origin) return;

        const response = await fetch(url.href, { cache: "force-cache" });
        if (!response.ok) return;

        const blob = await response.blob();
        image.setAttribute("src", await blobToDataUrl(blob));
      } catch {
        // Leave the original src in place; the export still captures non-image UI.
      }
    })
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not inline image for export."));
    reader.readAsDataURL(blob);
  });
}

function collectDocumentStyles() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render desk snapshot."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode desk snapshot as PNG."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
