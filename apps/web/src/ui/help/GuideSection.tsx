import type { GuideSectionContent } from "../../content/guide/types";

type GuideSectionProps = {
  section: GuideSectionContent;
};

export function GuideSection({ section }: GuideSectionProps) {
  return (
    <article className="guide-section">
      <h3>{section.title}</h3>
      {section.intro && <p className="guide-intro">{section.intro}</p>}
      {section.blocks.map((block) => (
        <section key={block.heading} className="guide-block">
          <h4>{block.heading}</h4>
          <p>{block.body}</p>
          {block.bullets && (
            <ul>
              {block.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
