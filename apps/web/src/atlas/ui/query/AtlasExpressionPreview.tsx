import type { AtlasExpression } from "../../core/types";
import { expressionPreview } from "../../core/expressions";

type AtlasExpressionPreviewProps = {
  expression: AtlasExpression;
};

export function AtlasExpressionPreview({ expression }: AtlasExpressionPreviewProps) {
  return (
    <div className="atlas-expression-preview" aria-label="Expression preview">
      <span>Expression</span>
      <strong>{expressionPreview(expression)}</strong>
    </div>
  );
}
