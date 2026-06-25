import { useState } from "react";
import { getDomainSymbolPath } from "../../assets/domainIcons";

type HiddenCardViewProps = {
  domain: string;
};

export function HiddenCardView({ domain }: HiddenCardViewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const symbolPath = getDomainSymbolPath(domain);

  return (
    <div className="hidden-card-face">
      {symbolPath && !imageFailed ? (
        <img
          className="hidden-card-symbol"
          src={symbolPath}
          alt={`${domain} symbol`}
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <strong className="hidden-card-symbol-fallback">{domain.slice(0, 1)}</strong>
      )}
      <span>{domain}</span>
      <small>Hidden</small>
    </div>
  );
}
