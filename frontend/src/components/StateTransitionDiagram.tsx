import { useState } from "react";

interface StateTransitionDiagramProps {
  matrix: number[][];
  states: string[];
}

interface HoverInfo {
  from: string;
  to: string;
  probability: number;
  x: number;
  y: number;
}

const StateTransitionDiagram = ({
  matrix,
  states,
}: StateTransitionDiagramProps) => {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // SVG dimensions
  const width = 600;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 150;
  const nodeRadius = 50;

  // Calculate node positions in a circle
  const getNodePosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Get color for state
  const getStateColor = (state: string): string => {
    const colors: Record<string, string> = {
      Sunny: "#FCD34D",
      Rainy: "#3B82F6",
      Cloudy: "#9CA3AF",
    };
    return colors[state] || "#6B7280";
  };

  // Get edge thickness based on probability
  const getEdgeThickness = (probability: number): number => {
    return Math.max(1, probability * 8);
  };

  // Get edge opacity based on probability
  const getEdgeOpacity = (probability: number): number => {
    return Math.max(0.2, probability);
  };

  // Calculate control point for curved edge
  const getCurveControlPoint = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    offset: number
  ) => {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length;
    const perpY = dx / length;
    return {
      x: midX + perpX * offset,
      y: midY + perpY * offset,
    };
  };

  // Handle edge hover
  const handleEdgeHover = (
    from: string,
    to: string,
    probability: number,
    event: React.MouseEvent
  ) => {
    setHoverInfo({
      from,
      to,
      probability,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleEdgeLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        State Transition Diagram
      </h2>
      <p className="text-gray-600 mb-6">
        Visual representation of weather state transitions with probabilities
      </p>

      <div className="flex justify-center">
        <svg
          width={width}
          height={height}
          className="border border-gray-200 rounded-lg bg-gray-50"
        >
          {/* Define arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#374151" />
            </marker>
          </defs>

          {/* Draw edges (transitions) */}
          {matrix.map((row, fromIndex) =>
            row.map((probability, toIndex) => {
              if (probability === 0) return null;

              const fromPos = getNodePosition(fromIndex, states.length);
              const toPos = getNodePosition(toIndex, states.length);

              // Self-loop
              if (fromIndex === toIndex) {
                const loopRadius = nodeRadius * 0.8;
                const loopX = fromPos.x;
                const loopY = fromPos.y - nodeRadius - loopRadius;

                return (
                  <g key={`${fromIndex}-${toIndex}`}>
                    <circle
                      cx={loopX}
                      cy={loopY}
                      r={loopRadius}
                      fill="none"
                      stroke="#374151"
                      strokeWidth={getEdgeThickness(probability)}
                      opacity={getEdgeOpacity(probability)}
                      onMouseEnter={(e) =>
                        handleEdgeHover(
                          states[fromIndex],
                          states[toIndex],
                          probability,
                          e
                        )
                      }
                      onMouseLeave={handleEdgeLeave}
                      className="cursor-pointer hover:stroke-blue-600"
                    />
                    <text
                      x={loopX}
                      y={loopY - loopRadius - 5}
                      textAnchor="middle"
                      className="text-xs font-semibold fill-gray-700"
                    >
                      {probability.toFixed(2)}
                    </text>
                  </g>
                );
              }

              // Calculate edge positions (from edge of node, not center)
              const angle = Math.atan2(
                toPos.y - fromPos.y,
                toPos.x - fromPos.x
              );
              const fromEdgeX = fromPos.x + nodeRadius * Math.cos(angle);
              const fromEdgeY = fromPos.y + nodeRadius * Math.sin(angle);
              const toEdgeX = toPos.x - nodeRadius * Math.cos(angle);
              const toEdgeY = toPos.y - nodeRadius * Math.sin(angle);

              // Curve offset for bidirectional edges
              const curveOffset = 30;
              const controlPoint = getCurveControlPoint(
                fromEdgeX,
                fromEdgeY,
                toEdgeX,
                toEdgeY,
                curveOffset
              );

              const pathData = `M ${fromEdgeX} ${fromEdgeY} Q ${controlPoint.x} ${controlPoint.y} ${toEdgeX} ${toEdgeY}`;

              // Calculate label position
              const labelPos = getCurveControlPoint(
                fromEdgeX,
                fromEdgeY,
                toEdgeX,
                toEdgeY,
                curveOffset + 15
              );

              return (
                <g key={`${fromIndex}-${toIndex}`}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#374151"
                    strokeWidth={getEdgeThickness(probability)}
                    opacity={getEdgeOpacity(probability)}
                    markerEnd="url(#arrowhead)"
                    onMouseEnter={(e) =>
                      handleEdgeHover(
                        states[fromIndex],
                        states[toIndex],
                        probability,
                        e
                      )
                    }
                    onMouseLeave={handleEdgeLeave}
                    className="cursor-pointer hover:stroke-blue-600 transition-colors"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-gray-700 pointer-events-none"
                  >
                    {probability.toFixed(2)}
                  </text>
                </g>
              );
            })
          )}

          {/* Draw nodes (states) */}
          {states.map((state, index) => {
            const pos = getNodePosition(index, states.length);
            return (
              <g key={state}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={getStateColor(state)}
                  stroke="#1F2937"
                  strokeWidth="3"
                  className="drop-shadow-md"
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-lg font-bold fill-gray-900 pointer-events-none"
                >
                  {state}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm z-50 pointer-events-none"
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
          }}
        >
          <div className="font-semibold">
            {hoverInfo.from} → {hoverInfo.to}
          </div>
          <div>Probability: {(hoverInfo.probability * 100).toFixed(1)}%</div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {states.map((state) => (
          <div key={state} className="flex items-center space-x-2">
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-800"
              style={{ backgroundColor: getStateColor(state) }}
            ></div>
            <span className="text-sm font-medium text-gray-700">{state}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Hover over edges to see detailed transition probabilities. Thicker edges
        indicate higher probability transitions.
      </p>
    </div>
  );
};

export default StateTransitionDiagram;
