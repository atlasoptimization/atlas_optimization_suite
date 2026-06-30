export type AtlasContextMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
};

export type AtlasContextMenuState =
  | {
      kind: "node";
      x: number;
      y: number;
      cardId: string;
    }
  | {
      kind: "canvas";
      x: number;
      y: number;
      position: { x: number; y: number };
    }
  | {
      kind: "connection";
      x: number;
      y: number;
      connectionId: string;
    }
  | {
      kind: "explorer";
      x: number;
      y: number;
      modelObjectId: string;
    };

type AtlasContextMenuProps = {
  menu: AtlasContextMenuState | null;
  items: AtlasContextMenuItem[];
  onSelect: (itemId: string) => void;
  onClose: () => void;
};

export function AtlasContextMenu({ menu, items, onSelect, onClose }: AtlasContextMenuProps) {
  if (!menu) return null;
  return (
    <div className="atlas-context-scrim" onPointerDown={onClose} onContextMenu={(event) => event.preventDefault()}>
      <menu
        className="atlas-context-menu"
        style={{ left: menu.x, top: menu.y }}
        aria-label={`${menu.kind} context menu`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            className={item.destructive ? "destructive" : ""}
            onClick={() => {
              if (item.disabled) return;
              onSelect(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </menu>
    </div>
  );
}
