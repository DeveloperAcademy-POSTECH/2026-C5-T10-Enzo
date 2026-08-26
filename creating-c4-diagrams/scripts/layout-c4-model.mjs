import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LAYOUT_TOKENS = Object.freeze({
  outerMargin: 144,
  nodeGap: 280,
  rowGap: 176,
  boundaryPadding: 112,
  supportGap: 240,
  boundaryTitleBand: 72,
  laneSeparation: 36,
  labelNodeClearance: 28,
  labelLabelClearance: 20,
});

const ROLE_METRICS = {
  person: { minW: 360, maxW: 460, minH: 440, chars: 25, header: 170 },
  "software-system": { minW: 400, maxW: 500, minH: 380, chars: 30, header: 56 },
  "external-system": { minW: 380, maxW: 480, minH: 340, chars: 29, header: 52 },
  "application-container": { minW: 400, maxW: 500, minH: 360, chars: 30, header: 64 },
  "data-store": { minW: 400, maxW: 480, minH: 340, chars: 29, header: 78 },
  component: { minW: 380, maxW: 480, minH: 280, chars: 29, header: 44 },
};

const MINIMUM_WORLD_SIZE = {
  1: { width: 1800, height: 1000 },
  2: { width: 2200, height: 1300 },
  3: { width: 2400, height: 1500 },
};

function lineCount(value, capacity) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const tokens = /\s/.test(text) ? text.split(/\s+/) : Array.from(text);
  let lines = 1;
  let used = 0;
  for (const token of tokens) {
    const length = Array.from(token).length + (/\s/.test(text) ? 1 : 0);
    if (used > 0 && used + length > capacity) {
      lines += 1;
      used = length;
    } else {
      used += length;
    }
  }
  return lines;
}

function roleFor(node) {
  if (ROLE_METRICS[node.visualRole]) return node.visualRole;
  if (node.type === "Person") return "person";
  if (node.type === "Software System") return node.external ? "external-system" : "software-system";
  if (node.type === "Container") return /store|database/i.test(node.visualRole ?? "") ? "data-store" : "application-container";
  return "component";
}

export function measureNode(node, locale = "ko") {
  const role = roleFor(node);
  const metrics = ROLE_METRICS[role];
  const density = locale === "ko" ? 0.86 : 1;
  const longest = Math.max(
    Array.from(String(node.name ?? "")).length,
    Array.from(String(node.technology ?? "")).length,
    ...String(node.description ?? "").split(/\s+/).map((token) => Array.from(token).length),
  );
  const w = Math.min(metrics.maxW, Math.max(metrics.minW, Math.ceil(longest * 9 * density + 96)));
  const capacity = Math.max(14, Math.floor(metrics.chars * (w / metrics.minW)));
  const titleLines = Math.max(1, lineCount(node.name, capacity));
  const technologyLines = lineCount(node.technology, capacity);
  const descriptionLines = Math.max(1, lineCount(node.description, capacity));
  const contentHeight = metrics.header + 36 + titleLines * 30 + technologyLines * 22 + descriptionLines * 25 + 42;
  const h = Math.max(metrics.minH, contentHeight);
  return {
    w,
    h,
    role,
    textBox: { x: 36, y: metrics.header, w: w - 72, h: h - metrics.header - 36 },
  };
}

export function rectanglesOverlap(a, b, clearance = 0) {
  return !(
    a.x + a.w + clearance <= b.x
    || b.x + b.w + clearance <= a.x
    || a.y + a.h + clearance <= b.y
    || b.y + b.h + clearance <= a.y
  );
}

function withPorts(node) {
  const centerX = node.x + node.w / 2;
  const centerY = node.y + node.h / 2;
  return {
    ...node,
    portHints: {
      left: { x: node.x, y: centerY },
      right: { x: node.x + node.w, y: centerY },
      top: { x: centerX, y: node.y },
      bottom: { x: centerX, y: node.y + node.h },
    },
  };
}

function semanticRank(element, level) {
  const text = `${element.name} ${element.description} ${element.visualRole}`.toLowerCase();
  if (level === 1) {
    if (element.type === "Person") return 0;
    if (element.type === "Software System" && !element.external) return 1;
    return 2;
  }
  if (/data-store|database|store|repository|persistence/.test(text)) return 4;
  if (/adapter|integration|gateway|bridge/.test(text)) return 3;
  if (/domain|analysis|engine|processor/.test(text)) return 2;
  if (/coordinator|flow|application/.test(text)) return 1;
  if (/presentation|ui|view|mobile|watch|iphone/.test(text)) return 0;
  return 2;
}

function ordered(elements, level) {
  return [...elements].sort((first, second) => semanticRank(first, level) - semanticRank(second, level) || first.id.localeCompare(second.id));
}

function horizontalNodes(elements, byId, locale, startX, baseline, gap = LAYOUT_TOKENS.nodeGap) {
  let x = startX;
  return elements.map((element) => {
    const measurement = measureNode(byId.get(element.id) ?? element, locale);
    const node = withPorts({ elementId: element.id, x, y: baseline - measurement.h, ...measurement });
    x += measurement.w + gap;
    return node;
  });
}

function supportingColumns(elements, byId, locale, x, centerY) {
  const measured = elements.map((element) => ({ element, measurement: measureNode(byId.get(element.id) ?? element, locale) }));
  const totalHeight = measured.reduce((sum, item) => sum + item.measurement.h, 0) + Math.max(0, measured.length - 1) * LAYOUT_TOKENS.rowGap;
  let y = Math.max(LAYOUT_TOKENS.outerMargin, centerY - totalHeight / 2);
  return measured.map(({ element, measurement }) => {
    const node = withPorts({ elementId: element.id, x, y, ...measurement });
    y += measurement.h + LAYOUT_TOKENS.rowGap;
    return node;
  });
}

const PORT_VECTORS = Object.freeze({
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
});

function anchorFor(node, port) {
  if (node.portHints?.[port]) return node.portHints[port];
  const centerX = node.x + node.w / 2;
  const centerY = node.y + node.h / 2;
  if (port === "left") return { x: node.x, y: centerY };
  if (port === "right") return { x: node.x + node.w, y: centerY };
  if (port === "top") return { x: centerX, y: node.y };
  return { x: centerX, y: node.y + node.h };
}

function shifted(point, vector, distance) {
  return { x: point.x + vector.x * distance, y: point.y + vector.y * distance };
}

function simplifyVertices(vertices) {
  const distinct = vertices.filter((point, index) => index === 0 || point.x !== vertices[index - 1].x || point.y !== vertices[index - 1].y);
  const simplified = [];
  for (const point of distinct) {
    const previous = simplified.at(-1);
    const beforePrevious = simplified.at(-2);
    if (beforePrevious && previous
      && ((beforePrevious.x === previous.x && previous.x === point.x)
        || (beforePrevious.y === previous.y && previous.y === point.y))) {
      simplified[simplified.length - 1] = point;
    } else {
      simplified.push(point);
    }
  }
  return simplified;
}

function segmentIntersectsRectangle(first, second, rectangle) {
  if (first.x === second.x) {
    return first.x > rectangle.x
      && first.x < rectangle.x + rectangle.w
      && Math.max(first.y, second.y) > rectangle.y
      && Math.min(first.y, second.y) < rectangle.y + rectangle.h;
  }
  if (first.y === second.y) {
    return first.y > rectangle.y
      && first.y < rectangle.y + rectangle.h
      && Math.max(first.x, second.x) > rectangle.x
      && Math.min(first.x, second.x) < rectangle.x + rectangle.w;
  }
  return true;
}

function routeAvoidsNodes(vertices, nodes) {
  return vertices.slice(1).every((point, index) => nodes.every((node) => !segmentIntersectsRectangle(vertices[index], point, node)));
}

function perimeterVertices(source, target, sourcePort, targetPort, nodes, laneDistance, clockwise) {
  const left = Math.max(0, Math.min(...nodes.map((node) => node.x)) - laneDistance);
  const right = Math.max(...nodes.map((node) => node.x + node.w)) + laneDistance;
  const top = Math.max(0, Math.min(...nodes.map((node) => node.y)) - laneDistance);
  const bottom = Math.max(...nodes.map((node) => node.y + node.h)) + laneDistance;
  const exitFor = (point, port) => ({
    left: { x: left, y: point.y },
    right: { x: right, y: point.y },
    top: { x: point.x, y: top },
    bottom: { x: point.x, y: bottom },
  })[port];
  const clockwiseSides = ["top", "right", "bottom", "left"];
  const counterClockwiseSides = ["top", "left", "bottom", "right"];
  const sides = clockwise ? clockwiseSides : counterClockwiseSides;
  const cornerAfter = clockwise
    ? { top: { x: right, y: top }, right: { x: right, y: bottom }, bottom: { x: left, y: bottom }, left: { x: left, y: top } }
    : { top: { x: left, y: top }, left: { x: left, y: bottom }, bottom: { x: right, y: bottom }, right: { x: right, y: top } };
  const sourceExit = exitFor(source, sourcePort);
  const targetExit = exitFor(target, targetPort);
  const points = [source, sourceExit];
  let sideIndex = sides.indexOf(sourcePort);
  const targetIndex = sides.indexOf(targetPort);
  while (sideIndex !== targetIndex) {
    points.push(cornerAfter[sides[sideIndex]]);
    sideIndex = (sideIndex + 1) % sides.length;
  }
  points.push(targetExit, target);
  return simplifyVertices(points);
}

function candidatePortPairs(source, target, configuration) {
  const dx = target.x + target.w / 2 - (source.x + source.w / 2);
  const dy = target.y + target.h / 2 - (source.y + source.h / 2);
  const horizontalTieBreak = ["LeftRight", "RightLeft"].includes(configuration?.direction);
  const horizontal = Math.abs(dx) === Math.abs(dy) ? horizontalTieBreak : Math.abs(dx) > Math.abs(dy);
  const horizontalPair = dx >= 0 ? ["right", "left"] : ["left", "right"];
  const verticalPair = dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
  const preferred = horizontal ? [horizontalPair, verticalPair] : [verticalPair, horizontalPair];
  const allPorts = ["left", "right", "top", "bottom"];
  const pairs = [...preferred];
  for (const sourcePort of allPorts) {
    for (const targetPort of allPorts) pairs.push([sourcePort, targetPort]);
  }
  return [...new Map(pairs.map((pair) => [pair.join(":"), pair])).values()];
}

export function routeRelationship({ relationship, source, target, nodes, laneIndex, configuration }) {
  const separation = Math.max(1, Number(configuration?.relationshipSeparation) || LAYOUT_TOKENS.laneSeparation);
  const lane = Math.max(0, Number.isInteger(laneIndex) ? laneIndex : 0);
  const stubDistance = separation * 1.5;
  const laneOffset = (lane + 1) * separation;
  const unrelatedNodes = nodes.filter(({ elementId }) => ![relationship.from, relationship.to].includes(elementId));

  for (const [sourcePort, targetPort] of candidatePortPairs(source, target, configuration)) {
    const sourceAnchor = anchorFor(source, sourcePort);
    const targetAnchor = anchorFor(target, targetPort);
    const sourceStub = shifted(sourceAnchor, PORT_VECTORS[sourcePort], stubDistance);
    const targetStub = shifted(targetAnchor, PORT_VECTORS[targetPort], stubDistance);
    const midX = (sourceStub.x + targetStub.x) / 2 + laneOffset;
    const midY = (sourceStub.y + targetStub.y) / 2 + laneOffset;
    const verticalRail = [sourceAnchor, sourceStub, { x: midX, y: sourceStub.y }, { x: midX, y: targetStub.y }, targetStub, targetAnchor];
    const horizontalRail = [sourceAnchor, sourceStub, { x: sourceStub.x, y: midY }, { x: targetStub.x, y: midY }, targetStub, targetAnchor];
    const horizontalPorts = [sourcePort, targetPort].every((port) => ["left", "right"].includes(port));
    const verticalPorts = [sourcePort, targetPort].every((port) => ["top", "bottom"].includes(port));
    const configuredHorizontal = ["LeftRight", "RightLeft"].includes(configuration?.direction);
    const laneRail = horizontalPorts || (!verticalPorts && configuredHorizontal) ? horizontalRail : verticalRail;
    const candidates = [
      laneRail,
      perimeterVertices(sourceAnchor, targetAnchor, sourcePort, targetPort, nodes, separation * (2 + lane), true),
      perimeterVertices(sourceAnchor, targetAnchor, sourcePort, targetPort, nodes, separation * (2 + lane), false),
    ].map(simplifyVertices);
    const vertices = candidates.find((candidate) => routeAvoidsNodes(candidate, unrelatedNodes));
    if (vertices) return { sourcePort, targetPort, vertices };
  }

  throw new Error(`Unable to route relationship ${relationship.id} without traversing an unrelated node.`);
}

export function measureRelationshipLabel(relationship, level, locale = "ko") {
  const lines = [relationship.description, relationship.technology].map((value) => String(value ?? "").trim()).filter(Boolean);
  const fontSize = level === 1 ? 18 : level === 2 ? 17 : 16;
  const characterWidth = fontSize * (locale === "ko" ? 0.92 : 0.56);
  const longestLine = Math.max(1, ...lines.map((line) => Array.from(line).length));
  return {
    width: Math.max(140, Math.ceil(longestLine * characterWidth + 48)),
    height: Math.ceil(Math.max(1, lines.length) * fontSize * 1.35 + 24),
  };
}

function labelRectangle(label) {
  if (Number.isFinite(label.w) && Number.isFinite(label.h)) return label;
  return {
    x: label.x - label.width / 2,
    y: label.y - label.height / 2,
    w: label.width,
    h: label.height,
  };
}

function segmentLabelCandidates(vertices, width, height, nodeClearance) {
  const segments = vertices.slice(1).map((target, index) => {
    const source = vertices[index];
    const horizontal = source.y === target.y;
    const length = horizontal ? Math.abs(target.x - source.x) : Math.abs(target.y - source.y);
    const extent = horizontal ? width : height;
    return { index, source, target, horizontal, length, extent };
  }).filter(({ length, extent }) => length >= extent + nodeClearance * 2);
  if (segments.length === 0) return [];
  const orderedSegments = [segments[0], segments.at(-1), ...segments]
    .filter((segment, index, items) => items.findIndex(({ index: candidateIndex }) => candidateIndex === segment.index) === index);
  return orderedSegments.flatMap((segment, orderedIndex) => {
    const direction = segment.horizontal
      ? Math.sign(segment.target.x - segment.source.x)
      : Math.sign(segment.target.y - segment.source.y);
    const nearExtent = segment.extent / 2 + nodeClearance;
    const nearSource = segment.horizontal
      ? { x: segment.source.x + direction * nearExtent, y: segment.source.y }
      : { x: segment.source.x, y: segment.source.y + direction * nearExtent };
    const nearTarget = segment.horizontal
      ? { x: segment.target.x - direction * nearExtent, y: segment.target.y }
      : { x: segment.target.x, y: segment.target.y - direction * nearExtent };
    const midpoint = { x: (segment.source.x + segment.target.x) / 2, y: (segment.source.y + segment.target.y) / 2 };
    return orderedIndex === 0 ? [nearSource, midpoint, nearTarget]
      : orderedIndex === 1 ? [nearTarget, midpoint, nearSource]
        : [midpoint, nearSource, nearTarget];
  });
}

function endpointPort(point, node) {
  return ["left", "right", "top", "bottom"].find((port) => {
    const anchor = anchorFor(node, port);
    return anchor.x === point.x && anchor.y === point.y;
  });
}

function fallbackLabelGeometry(vertices, bounds, occupiedRectangles, nodes, nodeClearance, labelClearance, laneSeparation, fits) {
  const source = vertices[0];
  const target = vertices.at(-1);
  const sourceNode = nodes.find((node) => endpointPort(source, node));
  const targetNode = nodes.find((node) => endpointPort(target, node));
  if (!sourceNode || !targetNode) throw new Error("Fallback label routing requires node boundary endpoints.");
  const unrelatedNodes = nodes.filter((node) => ![sourceNode.elementId, targetNode.elementId].includes(node.elementId));
  const laneDistance = nodeClearance
    + Math.max(bounds.width, bounds.height) / 2
    + (laneSeparation + labelClearance) * (occupiedRectangles.length + 2);

  for (const [sourcePort, targetPort] of candidatePortPairs(sourceNode, targetNode, { direction: "LeftRight" })) {
    const sourceAnchor = anchorFor(sourceNode, sourcePort);
    const targetAnchor = anchorFor(targetNode, targetPort);
    const candidates = [
      perimeterVertices(sourceAnchor, targetAnchor, sourcePort, targetPort, nodes, laneDistance, true),
      perimeterVertices(sourceAnchor, targetAnchor, sourcePort, targetPort, nodes, laneDistance, false),
    ];
    for (const routedVertices of candidates) {
      if (!routeAvoidsNodes(routedVertices, unrelatedNodes)) continue;
      const candidate = segmentLabelCandidates(routedVertices, bounds.width, bounds.height, nodeClearance).find(fits);
      if (candidate) {
        return {
          sourcePort,
          targetPort,
          vertices: routedVertices,
          label: { ...candidate, width: bounds.width, height: bounds.height },
        };
      }
    }
  }
  throw new Error("Unable to add a collision-free outer lane for relationship label geometry.");
}

export function placeRelationshipLabel({ vertices, bounds, occupiedLabels = [], nodes = [], clearance = {} }) {
  const nodeClearance = typeof clearance === "number" ? clearance : Number(clearance.node ?? clearance.labelNodeClearance) || LAYOUT_TOKENS.labelNodeClearance;
  const labelClearance = typeof clearance === "number" ? clearance : Number(clearance.label ?? clearance.labelLabelClearance) || LAYOUT_TOKENS.labelLabelClearance;
  const laneSeparation = typeof clearance === "number" ? clearance : Number(clearance.lane ?? clearance.relationshipSeparation) || LAYOUT_TOKENS.laneSeparation;
  const width = Number(bounds.width ?? bounds.w);
  const height = Number(bounds.height ?? bounds.h);
  const occupiedRectangles = occupiedLabels.map(labelRectangle);
  const fits = (candidate) => {
    const rectangle = labelRectangle({ ...candidate, width, height });
    return rectangle.x >= 0
      && rectangle.y >= 0
      && nodes.every((node) => !rectanglesOverlap(rectangle, node, nodeClearance))
      && occupiedRectangles.every((label) => !rectanglesOverlap(rectangle, label, labelClearance));
  };
  const candidate = segmentLabelCandidates(vertices, width, height, nodeClearance).find(fits);
  if (candidate) return { vertices, label: { ...candidate, width, height } };
  return fallbackLabelGeometry(vertices, { width, height }, occupiedRectangles, nodes, nodeClearance, labelClearance, laneSeparation, fits);
}

function relationshipLayouts(model, view, nodes) {
  const nodeById = new Map(nodes.map((node) => [node.elementId, node]));
  const relationshipById = new Map(model.relationships.map((relationship) => [relationship.id, relationship]));
  const occupiedLabels = [];
  return view.relationshipIds.map((relationshipId, laneIndex) => {
    const relationship = relationshipById.get(relationshipId);
    const route = routeRelationship({
      relationship,
      source: nodeById.get(relationship.from),
      target: nodeById.get(relationship.to),
      nodes,
      laneIndex,
      configuration: view.layoutConfiguration,
    });
    const bounds = measureRelationshipLabel(relationship, view.level, model.project?.language ?? "ko");
    const placement = placeRelationshipLabel({
      vertices: route.vertices,
      bounds,
      occupiedLabels,
      nodes,
      clearance: {
        node: LAYOUT_TOKENS.labelNodeClearance,
        label: LAYOUT_TOKENS.labelLabelClearance,
        lane: view.layoutConfiguration?.relationshipSeparation,
      },
    });
    occupiedLabels.push(placement.label);
    return {
      relationshipId,
      geometryVersion: 2,
      sourcePort: placement.sourcePort ?? route.sourcePort,
      targetPort: placement.targetPort ?? route.targetPort,
      vertices: placement.vertices,
      label: placement.label,
    };
  });
}

function legendFor(view, byId) {
  return [...new Set(view.elementIds.map((id) => roleFor(byId.get(id))))].sort();
}

function layoutL1(model, view, byId, locale) {
  const elements = ordered(view.elementIds.map((id) => byId.get(id)).filter(Boolean), 1);
  const measured = elements.map((element) => measureNode(element, locale));
  const baseline = LAYOUT_TOKENS.outerMargin + Math.max(...measured.map(({ h }) => h));
  const nodes = horizontalNodes(elements, byId, locale, LAYOUT_TOKENS.outerMargin, baseline);
  const width = Math.max(...nodes.map((node) => node.x + node.w)) + LAYOUT_TOKENS.outerMargin;
  return { nodes, boundaries: [], worldSize: { width, height: baseline + LAYOUT_TOKENS.outerMargin } };
}

function layoutScopedView(model, view, byId, locale) {
  const memberType = view.level === 2 ? "Container" : "Component";
  const members = ordered(
    view.elementIds.map((id) => byId.get(id)).filter((element) => element?.type === memberType && element.parentId === view.scopeId),
    view.level,
  );
  const support = view.elementIds.map((id) => byId.get(id)).filter((element) => element && !members.some(({ id }) => id === element.id));
  const left = ordered(support.filter(({ type }) => type === "Person"), view.level);
  const right = ordered(support.filter(({ type }) => type !== "Person"), view.level);
  const leftMeasurements = left.map((element) => measureNode(element, locale));
  const leftWidth = leftMeasurements.length ? Math.max(...leftMeasurements.map(({ w }) => w)) : 0;
  const boundaryX = LAYOUT_TOKENS.outerMargin + (leftWidth ? leftWidth + LAYOUT_TOKENS.supportGap : 0);
  const boundaryY = LAYOUT_TOKENS.outerMargin;
  const columns = Math.max(1, Math.min(view.level === 2 ? members.length : 3, members.length));
  const rows = Math.max(1, Math.ceil(members.length / columns));
  const measurements = members.map((element) => measureNode(element, locale));
  const cellW = Math.max(320, ...measurements.map(({ w }) => w));
  const cellH = Math.max(230, ...measurements.map(({ h }) => h));
  const innerTop = boundaryY + LAYOUT_TOKENS.boundaryTitleBand + LAYOUT_TOKENS.boundaryPadding;
  const boundaryW = LAYOUT_TOKENS.boundaryPadding * 2 + columns * cellW + Math.max(0, columns - 1) * LAYOUT_TOKENS.nodeGap;
  const boundaryH = LAYOUT_TOKENS.boundaryTitleBand + LAYOUT_TOKENS.boundaryPadding * 2 + rows * cellH + Math.max(0, rows - 1) * LAYOUT_TOKENS.rowGap;
  const memberNodes = members.map((element, index) => {
    const measurement = measurements[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    return withPorts({
      elementId: element.id,
      x: boundaryX + LAYOUT_TOKENS.boundaryPadding + column * (cellW + LAYOUT_TOKENS.nodeGap) + (cellW - measurement.w) / 2,
      y: innerTop + row * (cellH + LAYOUT_TOKENS.rowGap) + (cellH - measurement.h) / 2,
      ...measurement,
    });
  });
  const centerY = boundaryY + boundaryH / 2;
  const leftNodes = supportingColumns(left, byId, locale, LAYOUT_TOKENS.outerMargin, centerY);
  const rightX = boundaryX + boundaryW + (right.length ? LAYOUT_TOKENS.supportGap : 0);
  const rightNodes = supportingColumns(right, byId, locale, rightX, centerY);
  const nodes = [...leftNodes, ...memberNodes, ...rightNodes];
  const boundary = {
    id: `${view.scopeId}-boundary`,
    scopeId: view.scopeId,
    x: boundaryX,
    y: boundaryY,
    w: boundaryW,
    h: boundaryH,
    titleBand: LAYOUT_TOKENS.boundaryTitleBand,
  };
  const width = Math.max(boundaryX + boundaryW, ...nodes.map((node) => node.x + node.w)) + LAYOUT_TOKENS.outerMargin;
  const height = Math.max(boundaryY + boundaryH, ...nodes.map((node) => node.y + node.h)) + LAYOUT_TOKENS.outerMargin;
  return { nodes, boundaries: [boundary], worldSize: { width, height } };
}

function centerInMinimumWorld(geometry, level) {
  const minimum = MINIMUM_WORLD_SIZE[level] ?? MINIMUM_WORLD_SIZE[3];
  const width = Math.max(minimum.width, geometry.worldSize.width);
  const height = Math.max(minimum.height, geometry.worldSize.height);
  const dx = (width - geometry.worldSize.width) / 2;
  const dy = (height - geometry.worldSize.height) / 2;
  const shiftPoint = (point) => ({ x: point.x + dx, y: point.y + dy });
  return {
    ...geometry,
    nodes: geometry.nodes.map((node) => ({
      ...node,
      x: node.x + dx,
      y: node.y + dy,
      portHints: Object.fromEntries(Object.entries(node.portHints ?? {}).map(([port, point]) => [port, shiftPoint(point)])),
    })),
    boundaries: geometry.boundaries.map((boundary) => ({ ...boundary, x: boundary.x + dx, y: boundary.y + dy })),
    worldSize: { width, height },
  };
}

export function layoutView(model, view) {
  const byId = new Map(model.elements.map((element) => [element.id, element]));
  const locale = model.project?.language ?? "ko";
  const rawGeometry = view.level === 1 ? layoutL1(model, view, byId, locale) : layoutScopedView(model, view, byId, locale);
  const geometry = centerInMinimumWorld(rawGeometry, view.level);
  const layouts = relationshipLayouts(model, view, geometry.nodes);
  const relationshipRight = Math.max(0, ...layouts.flatMap(({ vertices, label }) => [
    ...vertices.map(({ x }) => x),
    label.x + label.width / 2,
  ]));
  const relationshipBottom = Math.max(0, ...layouts.flatMap(({ vertices, label }) => [
    ...vertices.map(({ y }) => y),
    label.y + label.height / 2,
  ]));
  return {
    ...view,
    ...geometry,
    worldSize: {
      width: Math.max(geometry.worldSize.width, relationshipRight + LAYOUT_TOKENS.outerMargin),
      height: Math.max(geometry.worldSize.height, relationshipBottom + LAYOUT_TOKENS.outerMargin),
    },
    relationshipLayouts: layouts,
    legend: legendFor(view, byId),
  };
}

export function layoutC4Model(model) {
  const laidOut = structuredClone(model);
  laidOut.views = laidOut.views.map((view) => layoutView(laidOut, view));
  laidOut.layout = { version: "1.0.0", tokens: LAYOUT_TOKENS };
  return laidOut;
}

async function writeJsonAtomic(outputPath, value) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, absolute);
}

export async function runLayoutCli(args = process.argv.slice(2), io = console) {
  const [inputPath, outputPath] = args;
  if (!inputPath || !outputPath) {
    io.error("Usage: layout-c4-model.mjs <normalized-model-json> <laid-out-model-json>");
    return 2;
  }
  try {
    const model = JSON.parse(await fs.readFile(inputPath, "utf8"));
    await writeJsonAtomic(outputPath, layoutC4Model(model));
    return 0;
  } catch (error) {
    io.error(error.message);
    return ["ENOENT", "EACCES"].includes(error.code) || error instanceof SyntaxError ? 2 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runLayoutCli();
}
