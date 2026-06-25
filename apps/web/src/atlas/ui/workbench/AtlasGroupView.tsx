import type { PointerEvent } from "react";
import type { AtlasGroup } from "../../core/types";

type AtlasGroupViewProps = {
  group: AtlasGroup;
  selected: boolean;
  onSelect: (groupId: string) => void;
};

export function AtlasGroupView({ group, selected, onSelect }: AtlasGroupViewProps) {
  function selectGroup(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    onSelect(group.id);
  }

  return (
    <section
      className={`atlas-group-region ${selected ? "selected" : ""}`}
      data-testid="atlas-group"
      data-group-id={group.id}
      style={{
        transform: `translate(${group.position.x}px, ${group.position.y}px)`,
        width: group.size.width,
        height: group.size.height,
        borderColor: group.color || undefined
      }}
      onPointerDown={selectGroup}
      tabIndex={0}
      aria-label={`Group ${group.title}`}
    >
      <header>
        <strong>{group.title}</strong>
        <span>
          {group.size.width} x {group.size.height}
        </span>
      </header>
      {group.notes && <p>{group.notes}</p>}
    </section>
  );
}
