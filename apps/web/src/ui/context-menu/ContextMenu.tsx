import { useEffect, useRef, useState, type RefObject } from "react";
import type { ContextMenuItem, ContextMenuPosition } from "./contextMenuTypes";
import { useUiProfile } from "../../hooks/useUiProfile";

type ContextMenuProps = {
  items: ContextMenuItem[];
  position: ContextMenuPosition;
  onAction: (item: ContextMenuItem) => void;
  onClose: () => void;
};

export function ContextMenu({ items, position, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isMobile } = useUiProfile();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (isMobile) {
    return (
      <MobileContextMenuSheet
        sheetRef={menuRef}
        items={items}
        onAction={onAction}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ContextMenuItems items={items} onAction={onAction} onClose={onClose} />
    </div>
  );
}

function MobileContextMenuSheet({
  sheetRef,
  items,
  onAction,
  onClose
}: {
  sheetRef: RefObject<HTMLDivElement | null>;
  items: ContextMenuItem[];
  onAction: (item: ContextMenuItem) => void;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<Array<{ title: string; items: ContextMenuItem[] }>>([
    { title: "Actions", items }
  ]);
  const current = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  useEffect(() => {
    setStack([{ title: "Actions", items }]);
  }, [items]);

  return (
    <div className="mobile-context-menu-backdrop" onPointerDown={onClose}>
      <div
        ref={sheetRef}
        className="mobile-context-menu-sheet"
        data-testid="mobile-context-menu-sheet"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="mobile-context-menu-header">
          {canGoBack ? (
            <button
              type="button"
              data-testid="mobile-context-menu-back"
              onClick={() => setStack((currentStack) => currentStack.slice(0, -1))}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <strong>{current.title}</strong>
          <button type="button" data-testid="mobile-context-menu-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="mobile-context-menu-list">
          {current.items.map((item) => (
            <MobileContextMenuRow
              key={item.id}
              item={item}
              onAction={onAction}
              onClose={onClose}
              onOpenChildren={(childItem) =>
                setStack((currentStack) => [
                  ...currentStack,
                  { title: childItem.label, items: childItem.children ?? [] }
                ])
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileContextMenuRow({
  item,
  onAction,
  onClose,
  onOpenChildren
}: {
  item: ContextMenuItem;
  onAction: (item: ContextMenuItem) => void;
  onClose: () => void;
  onOpenChildren: (item: ContextMenuItem) => void;
}) {
  const enabled = item.enabled ?? true;
  const hasChildren = Boolean(item.children?.length);

  if (item.control?.type === "range") {
    return <ContextMenuRangeRow item={item} enabled={enabled} onAction={onAction} />;
  }

  if (hasChildren) {
    return (
      <button
        type="button"
        className="mobile-context-menu-row"
        disabled={!enabled}
        onClick={() => {
          if (enabled) onOpenChildren(item);
        }}
      >
        <span>
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          {item.label}
        </span>
        <span className="context-menu-chevron">›</span>
      </button>
    );
  }

  if (item.href) {
    return (
      <a
        className="mobile-context-menu-row mobile-context-menu-link"
        href={enabled ? item.href : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!enabled}
        onClick={(event) => {
          if (!enabled) {
            event.preventDefault();
            return;
          }
          item.onClick?.();
          onClose();
        }}
      >
        <span>
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          {item.label}
        </span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`mobile-context-menu-row ${item.id === "delete-instance" ? "context-menu-danger" : ""}`}
      disabled={!enabled}
      onClick={() => {
        if (!enabled) return;
        onAction(item);
        onClose();
      }}
    >
      <span>
        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
        {item.label}
      </span>
    </button>
  );
}

function ContextMenuItems({
  items,
  onAction,
  onClose
}: {
  items: ContextMenuItem[];
  onAction: (item: ContextMenuItem) => void;
  onClose: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <ContextMenuRow key={item.id} item={item} onAction={onAction} onClose={onClose} />
      ))}
    </>
  );
}

function ContextMenuRow({
  item,
  onAction,
  onClose
}: {
  item: ContextMenuItem;
  onAction: (item: ContextMenuItem) => void;
  onClose: () => void;
}) {
  const enabled = item.enabled ?? true;
  const hasChildren = Boolean(item.children?.length);

  if (item.control?.type === "range") {
    return <ContextMenuRangeRow item={item} enabled={enabled} onAction={onAction} />;
  }

  if (hasChildren) {
    return (
      <div className="context-menu-submenu">
        <button
          type="button"
          className="context-menu-submenu-trigger"
          disabled={!enabled}
          onClick={(event) => event.preventDefault()}
        >
          <span>
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            {item.label}
          </span>
          <span className="context-menu-chevron">›</span>
        </button>
        {enabled && (
          <div className="context-menu-submenu-panel">
            <ContextMenuItems items={item.children ?? []} onAction={onAction} onClose={onClose} />
          </div>
        )}
      </div>
    );
  }

  if (item.href) {
    return (
      <a
        className="context-menu-link"
        href={enabled ? item.href : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!enabled}
        onClick={(event) => {
          if (!enabled) {
            event.preventDefault();
            return;
          }
          item.onClick?.();
          onClose();
        }}
      >
        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
        {item.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={item.id === "delete-instance" ? "context-menu-danger" : undefined}
      disabled={!enabled}
      onClick={() => {
        if (!enabled) return;
        onAction(item);
        onClose();
      }}
    >
      {item.icon && <span className="context-menu-icon">{item.icon}</span>}
      {item.label}
    </button>
  );
}

function ContextMenuRangeRow({
  item,
  enabled,
  onAction
}: {
  item: ContextMenuItem;
  enabled: boolean;
  onAction: (item: ContextMenuItem) => void;
}) {
  const control = item.control;
  const [value, setValue] = useState(control?.value ?? 1);

  useEffect(() => {
    if (control) setValue(control.value);
  }, [control]);

  if (!control) return null;

  return (
    <label className="context-menu-range" aria-disabled={!enabled}>
      <span>
        {item.label}
        <strong>{value.toFixed(2)}x</strong>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        disabled={!enabled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          if (!enabled) return;
          const nextValue = Number(event.target.value);
          setValue(nextValue);
          onAction({
            ...item,
            action: control.actionForValue(nextValue)
          });
        }}
      />
    </label>
  );
}
