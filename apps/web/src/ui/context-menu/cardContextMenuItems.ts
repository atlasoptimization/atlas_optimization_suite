import type { CardInstance } from "../../core/types/session";
import type { CardDisplayMode } from "../../core/types/view";
import { isAspectDomain } from "../../core/constants/aspect";
import { resolvePublicAssetUrl } from "../../assets/publicAssetUrl";
import { openPdfAsset } from "../../assets/openPdfAsset";
import type { ContextMenuItem } from "./contextMenuTypes";

const MIN_CARD_SCALE = 0.4;
const MAX_CARD_SCALE = 3;
const CARD_SCALE_STEP = 0.05;

const displayModes: { displayMode: CardDisplayMode; label: string }[] = [
  { displayMode: "card-face-and-active-effect", label: "Standard view: front + back + active effect" },
  { displayMode: "text-card", label: "Text card" },
  { displayMode: "pdf-front", label: "PDF front" },
  { displayMode: "pdf-back", label: "PDF back" },
  { displayMode: "pdf-both", label: "PDF front + back" },
  { displayMode: "active-effect", label: "Active effect only" },
  { displayMode: "compact-name", label: "Compact" },
  { displayMode: "scientific-twin", label: "Scientific" },
  { displayMode: "question", label: "Question" },
  { displayMode: "flavor-text", label: "Flavor text" },
  { displayMode: "full-card-image", label: "Legacy full card image" }
];

export function getCardContextMenuItems(
  instance: CardInstance,
  domain: string,
  pdfPath?: string | null
): ContextMenuItem[] {
  const resolvedPdfPath = resolvePublicAssetUrl(pdfPath);
  const orientationMenu: ContextMenuItem = isAspectDomain(domain)
    ? {
        id: "orientation",
        label: "Orientation",
        children: [
          {
            id: "set-modifier",
            label: "→ Modifier",
            action: {
              type: "card.setOrientation",
              instanceId: instance.instanceId,
              orientation: "modifier"
            }
          }
        ]
      }
    : {
        id: "orientation",
        label: "Orientation",
        children: [
          {
            id: "set-upright",
            label: "↑ Virtue / Upright",
            action: {
              type: "card.setOrientation",
              instanceId: instance.instanceId,
              orientation: "upright"
            }
          },
          {
            id: "set-reversed",
            label: "↓ Pathology / Reversed",
            action: {
              type: "card.setOrientation",
              instanceId: instance.instanceId,
              orientation: "reversed"
            }
          },
          {
            id: "set-modifier",
            label: "→ Modifier",
            action: {
              type: "card.setOrientation",
              instanceId: instance.instanceId,
              orientation: "modifier"
            }
          },
          {
            id: "set-question",
            label: "? Question",
            action: {
              type: "card.setOrientation",
              instanceId: instance.instanceId,
              orientation: "question"
            }
          }
        ]
      };
  const items: ContextMenuItem[] = [
    orientationMenu,
    {
      id: "display",
      label: "Display",
      children: displayModes.map(({ displayMode, label }) => ({
        id: `display-${displayMode}`,
        label,
        action:
          displayMode === "card-face-and-active-effect"
            ? [
                {
                  type: "card.setDisplayMode" as const,
                  instanceId: instance.instanceId,
                  displayMode
                },
                {
                  type: "card.setFace" as const,
                  instanceId: instance.instanceId,
                  face: "both" as const
                }
              ]
            : {
                type: "card.setDisplayMode" as const,
                instanceId: instance.instanceId,
                displayMode
              }
      }))
    },
    {
      id: "size",
      label: "Size",
      children: [
        {
          id: "size-slider",
          label: "Scale",
          control: {
            type: "range",
            min: MIN_CARD_SCALE,
            max: MAX_CARD_SCALE,
            step: CARD_SCALE_STEP,
            value: instance.scale,
            actionForValue: (scale) => ({
              type: "card.setScale",
              instanceId: instance.instanceId,
              scale
            })
          }
        },
        {
          id: "size-reset",
          label: "Reset size",
          action: {
            type: "card.resetScale",
            instanceId: instance.instanceId
          }
        }
      ]
    },
    {
      id: "secret",
      label: "Secret",
      children: [
        instance.hidden
          ? {
              id: "reveal",
              label: "Reveal",
              action: {
                type: "card.reveal",
                instanceId: instance.instanceId
              }
            }
          : {
              id: "hide",
              label: "Hide",
              action: {
                type: "card.hide",
                instanceId: instance.instanceId
              }
            }
      ]
    }
  ];

  const facePdfMenu: ContextMenuItem = {
      id: "face-pdf",
      label: "Face / PDF",
      children: [
        {
          id: "face-front",
          label: "Show PDF front",
          action: [
            {
              type: "card.setDisplayMode",
              instanceId: instance.instanceId,
              displayMode: "card-face"
            },
            {
              type: "card.setFace",
              instanceId: instance.instanceId,
              face: "front"
            }
          ]
        },
        {
          id: "face-back",
          label: "Show PDF back",
          action: [
            {
              type: "card.setDisplayMode",
              instanceId: instance.instanceId,
              displayMode: "card-face"
            },
            {
              type: "card.setFace",
              instanceId: instance.instanceId,
              face: "back"
            }
          ]
        },
        {
          id: "face-both",
          label: "Show PDF front + back",
          action: [
            {
              type: "card.setDisplayMode",
              instanceId: instance.instanceId,
              displayMode: "card-face"
            },
            {
              type: "card.setFace",
              instanceId: instance.instanceId,
              face: "both"
            }
          ]
        },
        {
          id: "face-active-effect",
          label: "Show front + back + active effect",
          action: [
            {
              type: "card.setDisplayMode",
              instanceId: instance.instanceId,
              displayMode: "card-face-and-active-effect"
            },
            {
              type: "card.setFace",
              instanceId: instance.instanceId,
              face: "both"
            }
          ]
        },
        {
          id: "face-toggle",
          label: "Toggle front/back",
          enabled: instance.face !== "both" && instance.displayMode === "card-face",
          action: {
            type: "card.toggleFace",
            instanceId: instance.instanceId
          }
        },
        {
          id: "open-pdf",
          label: resolvedPdfPath ? "Open PDF" : "PDF is not bundled in this build.",
          enabled: Boolean(resolvedPdfPath),
          onClick: () => openPdfAsset(pdfPath)
        }
      ]
    };

  if (!instance.hidden) items.push(facePdfMenu);

  items.push(
    {
      id: "study",
      label: "Study",
      children: [
        {
          id: "toggle-ablated",
          label: instance.ablated ? "Restore ablated/destroyed card" : "Toggle ablated/destroyed",
          action: {
            type: "card.toggleAblated",
            instanceId: instance.instanceId
          }
        }
      ]
    },
    {
      id: "actions",
      label: "Actions",
      children: [
        {
          id: "rotate-90",
          label: "Rotate 90°",
          action: {
            type: "card.rotate",
            instanceId: instance.instanceId
          }
        }
      ]
    },
    {
      id: "delete-instance",
      label: "Move to discard",
      action: {
        type: "card.deleteInstanceToDiscard",
        instanceId: instance.instanceId,
        domain
      }
    }
  );

  return items;
}
