import type { GuideSectionContent } from "./types";

export const customDomainsGuide: GuideSectionContent = {
  id: "custom-domains",
  title: "Custom Domains",
  intro: "Custom domains are optional local content packs discovered during asset sync and enabled only when you choose to use them.",
  blocks: [
    {
      heading: "What they are",
      body: "Custom domains are optional folder-based deck extensions with their own metadata, card CSV, optional art, and generated PDFs."
    },
    {
      heading: "Activation",
      body: "Discovered custom domains are inactive by default. Use the Custom Assets section in the left card browser, then Manage custom domains, to enable or disable each pack."
    },
    {
      heading: "Custom Cards vs Domains",
      body: "Custom Cards are created inside the app for local one-off ideas. Custom Domains are synced folder-based packs and appear as domain piles only when enabled."
    },
    {
      heading: "Sync Workflow",
      body: "The browser app cannot scan your filesystem or run scripts directly. Run asset sync from the repository root after editing a custom domain:",
      bullets: [
        "Copy the example custom domain folder.",
        "Rename the copied folder.",
        "Edit templates/domain_metadata.txt.",
        "Edit templates/card_data_*.csv.",
        "Put background images in background/.",
        "Put card artwork in card_graphics/.",
        "Do not modify placeholders/, icons/, output/, or generator scripts unless you deliberately maintain the generator pipeline.",
        "Run the custom domain generator externally to create PDFs in output/.",
        "Open a terminal in the data-science-deck-app repository root and run pnpm sync:assets.",
        "Reload the app.",
        "Open the Custom Domains manager.",
        "Enable the discovered custom domain."
      ]
    },
    {
      heading: "Folder",
      body: "The relative repository folder is custom_domains/. Browser builds cannot open arbitrary local folders directly, so use the copy button below and open the folder from your editor or file manager."
    },
    {
      heading: "Troubleshooting",
      body: "If a domain is not listed, check that the folder is inside custom_domains/, templates/domain_metadata.txt exists, the referenced CSV exists, and pnpm sync:assets has no relevant warnings. If PDFs are missing, run the generator and check output/; cards still display with text-card fallback. If previews are blurry, increase PDF_PREVIEW_DPI and rerun sync. The whole Custom Assets UI can be hidden from View settings; public/server builds may hide it by default later."
    }
  ]
};
