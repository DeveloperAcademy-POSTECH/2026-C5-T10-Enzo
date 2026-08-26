import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractDslIdentifiers, relationshipSemanticKey } from "./export-structurizr-dsl.mjs";
import { validateC4Model } from "./normalize-c4-model.mjs";
import { rectanglesOverlap } from "./layout-c4-model.mjs";

function validationIssue(code, message, details = {}) {
  return { severity: "error", code, message, ...details };
}

function warning(code, message, details = {}) {
  return { severity: "warning", code, message, ...details };
}

function embeddedModelText(html) {
  const matches = [...String(html).matchAll(/<script[^>]*id=["']architecture-model["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return { count: matches.length, text: matches[0]?.[1]?.trim() ?? "" };
}

function externalRuntimeUrls(html) {
  return [...String(html).matchAll(/<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url) => /^https?:\/\//i.test(url));
}

function labelRectangle(label) {
  return {
    x: label.x - label.width / 2,
    y: label.y - label.height / 2,
    w: label.width,
    h: label.height,
  };
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
  return false;
}

function positiveSegmentsOverlap(first, second) {
  const firstHorizontal = first.start.y === first.end.y;
  const secondHorizontal = second.start.y === second.end.y;
  if (firstHorizontal && secondHorizontal && first.start.y === second.start.y) {
    const overlap = Math.min(Math.max(first.start.x, first.end.x), Math.max(second.start.x, second.end.x))
      - Math.max(Math.min(first.start.x, first.end.x), Math.min(second.start.x, second.end.x));
    return overlap > 0;
  }
  if (!firstHorizontal && !secondHorizontal && first.start.x === second.start.x) {
    const overlap = Math.min(Math.max(first.start.y, first.end.y), Math.max(second.start.y, second.end.y))
      - Math.max(Math.min(first.start.y, first.end.y), Math.min(second.start.y, second.end.y));
    return overlap > 0;
  }
  return false;
}

const RELATIONSHIP_PORTS = new Set(["left", "right", "top", "bottom"]);
const GEOMETRY_TOLERANCE = 1e-6;

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function portLiesOnNamedEdge(node, port, point) {
  if (!point || ![node?.x, node?.y, node?.w, node?.h, point.x, point.y].every(finiteNumber)) return false;
  if (port === "left" || port === "right") {
    const edgeX = port === "left" ? node.x : node.x + node.w;
    return Math.abs(point.x - edgeX) <= GEOMETRY_TOLERANCE
      && point.y >= node.y - GEOMETRY_TOLERANCE
      && point.y <= node.y + node.h + GEOMETRY_TOLERANCE;
  }
  const edgeY = port === "top" ? node.y : node.y + node.h;
  return Math.abs(point.y - edgeY) <= GEOMETRY_TOLERANCE
    && point.x >= node.x - GEOMETRY_TOLERANCE
    && point.x <= node.x + node.w + GEOMETRY_TOLERANCE;
}

function portAnchor(node, port) {
  if (!node || !RELATIONSHIP_PORTS.has(port)) return null;
  const hinted = node.portHints?.[port];
  if (hinted) return portLiesOnNamedEdge(node, port, hinted) ? hinted : null;
  const derived = port === "left" ? { x: node.x, y: node.y + node.h / 2 }
    : port === "right" ? { x: node.x + node.w, y: node.y + node.h / 2 }
      : port === "top" ? { x: node.x + node.w / 2, y: node.y }
        : { x: node.x + node.w / 2, y: node.y + node.h };
  return portLiesOnNamedEdge(node, port, derived) ? derived : null;
}

function samePoint(first, second) {
  return [first?.x, first?.y, second?.x, second?.y].every(finiteNumber)
    && Math.abs(first.x - second.x) <= GEOMETRY_TOLERANCE
    && Math.abs(first.y - second.y) <= GEOMETRY_TOLERANCE;
}

function validLabel(label) {
  return label
    && [label.x, label.y, label.width, label.height].every(Number.isFinite)
    && label.width > 0
    && label.height > 0;
}

function exactGeometryView(view) {
  return (view.relationshipLayouts ?? []).some((layout) =>
    layout?.geometryVersion !== undefined || layout?.vertices !== undefined || layout?.label !== undefined);
}

function stateDetails(state) {
  return state.selectedNodeId ? { state: state.name, selectedNodeId: state.selectedNodeId } : { state: state.name };
}

export function inspectViewGeometry(model, view) {
  const errors = [];
  const warnings = [];
  const nodes = view.nodes ?? [];
  const relationshipById = new Map((model.relationships ?? []).map((relationship) => [relationship.id, relationship]));
  const layouts = view.relationshipLayouts ?? [];

  if (!exactGeometryView(view)) return { errors, warnings };

  const validLayouts = [];
  for (const layout of layouts) {
    const relationshipId = layout?.relationshipId;
    const vertices = layout?.vertices;
    const relationship = relationshipById.get(relationshipId);
    const sourceNode = nodes.find(({ elementId }) => elementId === relationship?.from);
    const targetNode = nodes.find(({ elementId }) => elementId === relationship?.to);
    const sourceAnchor = portAnchor(sourceNode, layout?.sourcePort);
    const targetAnchor = portAnchor(targetNode, layout?.targetPort);
    const pathIsValid = layout?.geometryVersion === 2
      && relationship
      && sourceAnchor
      && targetAnchor
      && Array.isArray(vertices)
      && vertices.length >= 2
      && vertices.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
      && samePoint(vertices[0], sourceAnchor)
      && samePoint(vertices.at(-1), targetAnchor)
      && vertices.slice(1).every((point, index) => {
        const previous = vertices[index];
        return (point.x === previous.x || point.y === previous.y)
          && (point.x !== previous.x || point.y !== previous.y);
      });

    if (!pathIsValid) {
      errors.push(validationIssue("geometry-path-invalid", "Relationship paths must use version 2 finite, positive-length orthogonal geometry.", { viewId: view.id, relationshipId }));
    } else {
      const seenSegments = [];
      for (let index = 1; index < vertices.length; index += 1) {
        const segment = { start: vertices[index - 1], end: vertices[index] };
        if (seenSegments.some((seen) => positiveSegmentsOverlap(seen, segment))) {
          errors.push(validationIssue("geometry-path-positive-retrace", "Relationship paths must not repeat a positive-length segment.", { viewId: view.id, relationshipId }));
          break;
        }
        seenSegments.push(segment);
      }

      if (relationship) {
        const unrelatedNodes = nodes.filter(({ elementId }) => ![relationship.from, relationship.to].includes(elementId));
        const traversed = unrelatedNodes.find((node) => vertices.slice(1)
          .some((point, index) => segmentIntersectsRectangle(vertices[index], point, node)));
        if (traversed) {
          errors.push(validationIssue("geometry-path-node-traversal", "Relationship paths must not traverse unrelated nodes.", {
            viewId: view.id,
            relationshipId,
            elementId: traversed.elementId,
          }));
        }
      }
    }

    if (!validLabel(layout?.label)) {
      errors.push(validationIssue("geometry-label-invalid", "Relationship labels must have finite center coordinates and positive bounds.", { viewId: view.id, relationshipId }));
    } else {
      validLayouts.push(layout);
    }
  }

  const states = [
    { name: "idle", layouts: [] },
    { name: "full", layouts: validLayouts },
    ...nodes.map((node) => ({
      name: "focus",
      selectedNodeId: node.elementId,
      layouts: validLayouts.filter((layout) => {
        const relationship = relationshipById.get(layout.relationshipId);
        return relationship && [relationship.from, relationship.to].includes(node.elementId);
      }),
    })),
  ];

  for (const state of states) {
    const details = stateDetails(state);
    const labels = state.layouts.map((layout) => ({ layout, rectangle: labelRectangle(layout.label) }));
    for (const { layout, rectangle } of labels) {
      if (rectangle.x < 0
        || rectangle.y < 0
        || rectangle.x + rectangle.w > view.worldSize?.width
        || rectangle.y + rectangle.h > view.worldSize?.height) {
        errors.push(validationIssue("geometry-label-outside-world", "Visible relationship labels must remain inside the SVG world.", {
          viewId: view.id,
          relationshipId: layout.relationshipId,
          ...details,
        }));
      }
      const overlappedNode = nodes.find((node) => rectanglesOverlap(rectangle, node, 0));
      if (overlappedNode) {
        errors.push(validationIssue("geometry-label-node-overlap", "Visible relationship labels must not overlap nodes.", {
          viewId: view.id,
          relationshipId: layout.relationshipId,
          elementId: overlappedNode.elementId,
          ...details,
        }));
      }
    }
    for (let first = 0; first < labels.length; first += 1) {
      for (let second = first + 1; second < labels.length; second += 1) {
        if (rectanglesOverlap(labels[first].rectangle, labels[second].rectangle, 0)) {
          errors.push(validationIssue("geometry-label-label-overlap", "Visible relationship labels must not overlap each other.", {
            viewId: view.id,
            relationshipIds: [labels[first].layout.relationshipId, labels[second].layout.relationshipId],
            ...details,
          }));
        }
      }
    }
  }

  return { errors, warnings };
}

function orderedBy(items, identity) {
  return [...(items ?? [])].sort((first, second) => String(identity(first) ?? "").localeCompare(String(identity(second) ?? "")));
}

function nodeGeometry(node) {
  return {
    elementId: node.elementId,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
    textBox: node.textBox,
    portHints: node.portHints,
  };
}

function boundaryGeometry(boundary) {
  return {
    id: boundary.id,
    scopeId: boundary.scopeId,
    x: boundary.x,
    y: boundary.y,
    w: boundary.w,
    h: boundary.h,
    titleBand: boundary.titleBand,
  };
}

function geometryProjection(model) {
  return {
    geometryVersion: model?.geometryVersion,
    views: orderedBy(model?.views, ({ id }) => id).map((view) => ({
      id: view.id,
      geometryVersion: view.geometryVersion,
      nodes: orderedBy(view.nodes, ({ elementId }) => elementId).map(nodeGeometry),
      boundaries: orderedBy(view.boundaries, ({ id, scopeId }) => id ?? scopeId).map(boundaryGeometry),
      worldSize: view.worldSize,
      layoutConfiguration: view.layoutConfiguration,
      relationshipLayouts: orderedBy(view.relationshipLayouts, ({ relationshipId }) => relationshipId),
    })),
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableGeometryJson(model) {
  return JSON.stringify(stableValue(geometryProjection(model)));
}

function dslSemanticProjection(model) {
  const sortText = (items) => [...(items ?? [])].sort((first, second) => {
    const a = String(first ?? "");
    const b = String(second ?? "");
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const views = sortText((model?.views ?? []).map(({ id }) => id));
  return {
    elements: sortText((model?.elements ?? []).map(({ id }) => id)),
    relationships: sortText((model?.relationships ?? []).map(relationshipSemanticKey)),
    views,
    viewMembers: Object.fromEntries(views.map((viewId) => {
      const view = (model?.views ?? []).find(({ id }) => id === viewId);
      return [viewId, sortText(view?.elementIds)];
    })),
  };
}

function validWorldSize(worldSize) {
  return finiteNumber(worldSize?.width)
    && finiteNumber(worldSize?.height)
    && worldSize.width > 0
    && worldSize.height > 0;
}

function validBoundaryBounds(boundary) {
  return [boundary?.x, boundary?.y].every(finiteNumber)
    && [boundary?.w, boundary?.h].every((value) => finiteNumber(value) && value > 0)
    && (boundary.titleBand === undefined || finiteNumber(boundary.titleBand) && boundary.titleBand >= 0);
}

function geometryIssues(model) {
  const errors = [];
  const warnings = [];
  const elements = new Map((model.elements ?? []).map((element) => [element.id, element]));

  for (const view of model.views ?? []) {
    const nodes = view.nodes ?? [];
    const worldIsValid = validWorldSize(view.worldSize);
    if (!worldIsValid) {
      errors.push(validationIssue("geometry-world-invalid", "View world size must be positive.", { viewId: view.id }));
    }
    const nodeById = new Map(nodes.map((node) => [node.elementId, node]));
    for (const elementId of view.elementIds ?? []) {
      const node = nodeById.get(elementId);
      if (!node) {
        errors.push(validationIssue("geometry-node-missing", "Visible element has no view geometry.", { viewId: view.id, elementId }));
        continue;
      }
      if (![node.x, node.y, node.w, node.h].every(Number.isFinite) || node.w <= 0 || node.h <= 0) {
        errors.push(validationIssue("geometry-node-invalid", "Node geometry must be finite and positive.", { viewId: view.id, elementId }));
      }
      if (worldIsValid && (node.x < 0 || node.y < 0 || node.x + node.w > view.worldSize.width || node.y + node.h > view.worldSize.height)) {
        errors.push(validationIssue("geometry-node-outside-world", "Node must remain inside the SVG world.", { viewId: view.id, elementId }));
      }
      if (node.textBox) {
        const box = node.textBox;
        if (box.x < 0 || box.y < 0 || box.x + box.w > node.w || box.y + box.h > node.h) {
          errors.push(validationIssue("geometry-text-bounds-invalid", "Node text box must remain inside its node.", { viewId: view.id, elementId }));
        }
      } else {
        warnings.push(warning("geometry-text-bounds-unreported", "Node has no explicit text box metadata.", { viewId: view.id, elementId }));
      }
    }
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        if (rectanglesOverlap(nodes[first], nodes[second], 0)) {
          errors.push(validationIssue("geometry-node-overlap", "Nodes must not overlap.", { viewId: view.id, elementIds: [nodes[first].elementId, nodes[second].elementId] }));
        }
      }
    }
    for (const boundary of view.boundaries ?? []) {
      if (!validBoundaryBounds(boundary)) {
        errors.push(validationIssue("geometry-boundary-invalid", "Boundary geometry must use finite coordinates and positive bounds.", { viewId: view.id, boundaryId: boundary.id }));
        continue;
      }
      const members = nodes.filter((node) => elements.get(node.elementId)?.parentId === boundary.scopeId);
      for (const node of members) {
        if (node.x < boundary.x || node.y < boundary.y + (boundary.titleBand ?? 0) || node.x + node.w > boundary.x + boundary.w || node.y + node.h > boundary.y + boundary.h) {
          errors.push(validationIssue("geometry-boundary-containment", "Scoped node must remain inside its boundary below the title band.", { viewId: view.id, elementId: node.elementId, boundaryId: boundary.id }));
        }
      }
    }
    if ((view.relationshipLayouts ?? []).length !== (view.relationshipIds ?? []).length) {
      errors.push(validationIssue("geometry-relationship-layout-missing", "Every visible relationship requires layout hints.", { viewId: view.id }));
    }
    const relationshipGeometry = inspectViewGeometry(model, view);
    errors.push(...relationshipGeometry.errors);
    warnings.push(...relationshipGeometry.warnings);
  }

  return { errors, warnings };
}

export async function validateC4Output({ model, html, workspaceDsl, repairs = [] }) {
  const errors = [];
  const warnings = [];
  const modelIssues = validateC4Model(model);
  const fatalModelCodes = /(?:invalid|dangling|required|forbidden)$/;
  for (const item of modelIssues) {
    (fatalModelCodes.test(item.code) ? errors : warnings).push(item);
  }

  const levels = (model.views ?? []).map(({ level }) => level);
  if (!levels.includes(1)) errors.push(validationIssue("view-level-1-required", "One System Context view is required."));
  if (!levels.includes(2)) errors.push(validationIssue("view-level-2-required", "One Container view is required."));
  if (!levels.includes(3)) errors.push(validationIssue("view-level-3-required", "At least one Component view is required."));
  if (levels.some((level) => level === 4)) errors.push(validationIssue("view-level-4-forbidden", "L4 Code diagrams are outside this skill."));

  if (workspaceDsl !== undefined) {
    const expected = dslSemanticProjection(model);
    const actual = extractDslIdentifiers(workspaceDsl);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(validationIssue(
        "workspace-dsl-semantic-mismatch",
        "Structurizr DSL identifiers, directed relationship semantics, or view membership do not match the canonical model.",
        { expected, actual },
      ));
    }
  }

  const geometry = geometryIssues(model);
  errors.push(...geometry.errors);
  warnings.push(...geometry.warnings);

  const embedded = embeddedModelText(html);
  let embeddedModel = null;
  if (embedded.count !== 1) {
    errors.push(validationIssue("embedded-model-count-invalid", "Explorer must contain exactly one embedded architecture model."));
  } else {
    try {
      embeddedModel = JSON.parse(embedded.text);
    } catch (error) {
      errors.push(validationIssue("embedded-model-json-invalid", error.message));
    }
  }
  if (embeddedModel && embeddedModel.project?.name !== model.project?.name) {
    errors.push(validationIssue("embedded-model-mismatch", "Embedded model does not match c4-model.json."));
  }
  if (embeddedModel && stableGeometryJson(embeddedModel) !== stableGeometryJson(model)) {
    errors.push(validationIssue("embedded-model-geometry-mismatch", "Embedded model geometry does not match c4-model.json."));
  }

  const externalUrls = externalRuntimeUrls(html);
  const hasFetch = /\bfetch\s*\(/.test(html);
  const hasModuleRuntime = /<script[^>]+type=["']module["']/i.test(html) || /\bimport\s*\(/.test(html);
  if (externalUrls.length || hasFetch || hasModuleRuntime) {
    errors.push(validationIssue("external-runtime-forbidden", "Explorer must run offline without external resources, fetch, or module imports.", { urls: externalUrls }));
  }

  const requiredControls = [
    'id="diagram-viewport"',
    'id="left-panel-close"',
    'data-action="fit-view"',
    'data-tool="hand"',
    'data-relationship-mode="focus"',
    "window.C4Explorer",
  ];
  const controlsPresent = requiredControls.every((token) => html.includes(token));
  if (!controlsPresent) errors.push(validationIssue("runtime-controls-missing", "Required canvas, panel, or relationship controls are missing."));

  const progressiveRelationships = html.includes("relationship is-")
    && html.includes("is-ambient")
    && html.includes("is-muted")
    && html.includes("labelVisible");
  if (!progressiveRelationships) errors.push(validationIssue("runtime-progressive-relationships-missing", "Progressive relationship disclosure contract is missing."));

  const accessibility = /:focus-visible/.test(html)
    && /prefers-reduced-motion/.test(html)
    && /prefers-contrast:\s*more/.test(html)
    && /aria-live/.test(html);
  if (!accessibility) errors.push(validationIssue("accessibility-contract-missing", "Focus, motion, contrast, or announcement support is missing."));

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    errors,
    warnings,
    repairs: Array.isArray(repairs) ? repairs : [],
    checks: {
      model: !errors.some(({ code }) => code.startsWith("element-") || code.startsWith("relationship-") || code.startsWith("view-") && !code.includes("level-")),
      views: levels.includes(1) && levels.includes(2) && levels.includes(3) && !levels.includes(4),
      geometry: geometry.errors.length === 0,
      offline: externalUrls.length === 0 && !hasFetch && !hasModuleRuntime,
      runtime: controlsPresent && progressiveRelationships && Boolean(embeddedModel),
      accessibility,
      level4Absent: !levels.includes(4),
    },
  };
}

export async function writeValidationReport(outputPath, report) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.rename(temporary, absolute);
  return absolute;
}

export async function runValidateCli(args = process.argv.slice(2), io = console) {
  const [modelPath, htmlPath, reportPath] = args;
  if (!modelPath || !htmlPath || !reportPath) {
    io.error("Usage: validate-c4-output.mjs <model-json> <explorer-html> <validation-report-json>");
    return 2;
  }
  try {
    const model = JSON.parse(await fs.readFile(modelPath, "utf8"));
    const html = await fs.readFile(htmlPath, "utf8");
    const report = await validateC4Output({ model, html });
    await writeValidationReport(reportPath, report);
    return report.errors.length ? 1 : 0;
  } catch (error) {
    io.error(error.message);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runValidateCli();
}
