import { useMemo } from 'react';

/**
 * Renders a hierarchical dendrogram from scipy linkage coordinates.
 *
 * scipy dendrogram returns icoord/dcoord where icoord values are leaf-index
 * positions (0..n-1 in optimal leaf order). We scale globally so all merges
 * align into a connected tree.
 */
export default function DendrogramChart({ icoord, dcoord, colorList, height = 420, cutHeight, cutLabel }) {
  const svg = useMemo(() => {
    const leafCount = icoord.length + 1;
    const maxD = Math.max(...dcoord.flatMap((d) => [d[0], d[2]]));

    // ── coordinate helpers ──────────────────────────────────
    // icoord x-values are leaf-index positions 0..n-1 — scale globally
    const px = (leafIdx) => 40 + (leafIdx / (leafCount - 1)) * (900 - 60);
    // distance 0 at bottom, maxD at top
    const chartTop = 30;
    const chartBottom = height - 50;
    const chartH = chartBottom - chartTop;
    const py = (dist) => chartBottom - (dist / (maxD || 1)) * chartH;

    // ── only render last 35 merges (highest / most significant) ──
    const totalMerges = icoord.length;
    const showMerges = Math.min(35, totalMerges);
    const startIdx = totalMerges - showMerges;

    // Collect visible merge heights to find the minimum display height
    const visibleHeights = [];
    for (let i = startIdx; i < totalMerges; i++) {
      visibleHeights.push(dcoord[i][0]);
    }
    const minVisibleHeight = Math.min(...visibleHeights);

    // Build a set of visible merge indices for quick lookup
    const visibleSet = new Set();
    for (let i = startIdx; i < totalMerges; i++) visibleSet.add(i);

    // ── grid lines ─────────────────────────────────────────
    const gridLines = [];
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const dVal = (maxD / ySteps) * i;
      const y = py(dVal);
      gridLines.push(
        <line
          key={`g${i}`}
          x1={35}
          y1={y}
          x2={955}
          y2={y}
          stroke="#e2e8f0"
          strokeWidth={0.5}
          strokeDasharray="2 4"
        />,
        <text
          key={`l${i}`}
          x={32}
          y={y + 3}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={9}
        >
          {dVal.toFixed(1)}
        </text>
      );
    }

    // ── dendrogram paths ───────────────────────────────────
    const paths = [];
    for (let i = startIdx; i < totalMerges; i++) {
      const ico = icoord[i];
      const dco = dcoord[i];
      const mergeH = dco[0];

      const xLeft = px(ico[0]);
      const xRight = px(ico[3]);
      const xMid = px(ico[2]);
      const yMerge = py(mergeH);
      // Each branch goes down to the minimum visible merge height
      // so child merges connect without going all the way to y=0
      const yBottom = py(minVisibleHeight);

      paths.push(
        <path
          key={i}
          d={`M${xLeft},${yMerge} V${yBottom} H${xMid} V${yMerge}`}
          fill="none"
          stroke={colorList[i]}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    // ── cut line ───────────────────────────────────────────
    let cutLine = null;
    if (cutHeight !== undefined && cutHeight > 0) {
      const yCut = py(cutHeight);
      cutLine = (
        <g key="cut">
          <line
            x1={35}
            y1={yCut}
            x2={955}
            y2={yCut}
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="8 4"
            opacity={0.8}
          />
          <rect
            x={790}
            y={yCut - 11}
            width={168}
            height={22}
            rx={5}
            fill="#1e293b"
            stroke="#f87171"
            strokeWidth={0.5}
            opacity={0.92}
          />
          <text
            x={874}
            y={yCut + 4}
            textAnchor="middle"
            fill="#f87171"
            fontSize={10}
            fontWeight={600}
          >
            {cutLabel || `Cut = ${cutHeight.toFixed(1)}`}
          </text>
        </g>
      );
    }

    // ── leaf labels (sparse, every Nth) ────────────────────
    const maxLabels = 25;
    const step = Math.max(1, Math.floor(leafCount / maxLabels));
    const leaves = [];
    for (let i = 0; i < leafCount; i += step) {
      leaves.push(
        <text
          key={i}
          x={px(i)}
          y={height - 22}
          textAnchor="middle"
          fill="#64748b"
          fontSize={8}
        >
          {i}
        </text>
      );
    }

    const svgW = 960;

    return (
      <svg
        width={svgW}
        height={height}
        viewBox={`0 0 ${svgW} ${height}`}
        className="overflow-visible"
      >
        {gridLines}
        {paths}
        {cutLine}
        {leaves}

        {/* axis labels */}
        <text x={svgW / 2} y={height - 2} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={500}>
          Customer Index ({leafCount} observations)
        </text>
        <text
          x={14}
          y={height / 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={11}
          fontWeight={500}
          transform={`rotate(-90, 14, ${height / 2})`}
        >
          Linkage Distance
        </text>
      </svg>
    );
  }, [icoord, dcoord, colorList, height, cutHeight, cutLabel]);

  return <div className="overflow-x-auto">{svg}</div>;
}
