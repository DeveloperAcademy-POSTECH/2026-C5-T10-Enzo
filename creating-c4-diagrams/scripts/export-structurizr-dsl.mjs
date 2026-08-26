const DSL_IDENTIFIER = /^[A-Za-z0-9_]+$/;
const ENCODED_IDENTIFIER = /^_c4_([0-9a-f]+)$/;

const TYPE_KEYWORDS = {
  Person: "person",
  "Software System": "softwareSystem",
  Container: "container",
  Component: "component",
};

const VIEW_KEYWORDS = {
  1: "systemContext",
  2: "container",
  3: "component",
};

const DIRECTION_KEYWORDS = {
  TopBottom: "tb",
  BottomTop: "bt",
  LeftRight: "lr",
  RightLeft: "rl",
};

const ELEMENT_STYLES = {
  Component: ["shape Component"],
  Container: ["shape RoundedBox"],
  Person: ["shape Person"],
  "Software System": ["shape RoundedBox"],
  "application-container": ["shape RoundedBox", "background #1c6998", "color #ffffff"],
  component: ["shape Component", "background #1c6998", "color #ffffff"],
  "data-store": ["shape Cylinder", "background #1c6998", "color #ffffff"],
  "external-system": ["shape RoundedBox", "background #6f7c87", "color #ffffff"],
  person: ["shape Person", "background #123f67", "color #ffffff"],
  "software-system": ["shape RoundedBox", "background #1c6998", "color #ffffff"],
};

function compareText(first, second) {
  const a = String(first ?? "");
  const b = String(second ?? "");
  return a < b ? -1 : a > b ? 1 : 0;
}

function sorted(items) {
  return [...(items ?? [])].sort(compareText);
}

function dslIdentifier(identifier) {
  const value = String(identifier ?? "");
  if (DSL_IDENTIFIER.test(value) && !value.startsWith("_c4_")) return value;
  return `_c4_${Buffer.from(value, "utf8").toString("hex")}`;
}

function canonicalIdentifier(identifier) {
  const match = String(identifier ?? "").match(ENCODED_IDENTIFIER);
  if (!match || match[1].length % 2 !== 0) return String(identifier ?? "");
  return Buffer.from(match[1], "hex").toString("utf8");
}

function unquoteDsl(value) {
  const token = String(value ?? "");
  if (!token.startsWith('"') || !token.endsWith('"')) return token;
  return token.slice(1, -1).replace(/\\([\\"])/g, "$1");
}

function tokenizeDsl(value) {
  return String(value ?? "").match(/"(?:\\.|[^"\\])*"|[^\s]+/g) ?? [];
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

export function quoteDsl(value) {
  const escaped = String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/\r\n|\r|\n/g, " ");
  return `"${escaped}"`;
}

export function relationshipSemanticKey({ from, to, description, technology = "" } = {}) {
  return JSON.stringify([
    String(from ?? ""),
    String(to ?? ""),
    String(description ?? ""),
    String(technology ?? ""),
  ]);
}

function elementMetadata(element) {
  const tags = quoteDsl(sorted(element.tags).join(","));
  if (element.type === "Person" || element.type === "Software System") {
    return [quoteDsl(element.name), quoteDsl(element.description), tags].join(" ");
  }
  return [quoteDsl(element.name), quoteDsl(element.description), quoteDsl(element.technology), tags].join(" ");
}

function autoLayoutStatement(view) {
  const configuration = view.layoutConfiguration ?? {};
  const direction = DIRECTION_KEYWORDS[configuration.direction] ?? "lr";
  const rankSeparation = positiveInteger(configuration.rankSeparation, 176);
  const nodeSeparation = positiveInteger(configuration.nodeSeparation, 280);
  return `autoLayout ${direction} ${rankSeparation} ${nodeSeparation}`;
}

export function exportStructurizrDsl(model) {
  const indent = (depth, value) => `${"  ".repeat(depth)}${value}`;
  const elements = [...(model?.elements ?? [])].sort((first, second) => compareText(first.id, second.id));
  const byParent = new Map();
  for (const element of elements) {
    const parentId = element.parentId ?? null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), element]);
  }

  const emitElement = (element, depth) => {
    const keyword = TYPE_KEYWORDS[element.type];
    const statement = `${dslIdentifier(element.id)} = ${keyword} ${elementMetadata(element)}`;
    const children = byParent.get(element.id) ?? [];
    if (children.length === 0) return [indent(depth, statement)];
    return [
      indent(depth, `${statement} {`),
      ...children.flatMap((child) => emitElement(child, depth + 1)),
      indent(depth, "}"),
    ];
  };

  const relationships = [...(model?.relationships ?? [])]
    .sort((first, second) => compareText(first.id, second.id))
    .map((relationship) => indent(
      2,
      `${dslIdentifier(relationship.from)} -> ${dslIdentifier(relationship.to)} ${quoteDsl(relationship.description)}${relationship.technology ? ` ${quoteDsl(relationship.technology)}` : ""}`,
    ));

  const views = [...(model?.views ?? [])]
    .sort((first, second) => Number(first.level) - Number(second.level) || compareText(first.id, second.id))
    .flatMap((view) => [
      indent(2, `${VIEW_KEYWORDS[view.level]} ${dslIdentifier(view.scopeId)} ${quoteDsl(view.id)} ${quoteDsl(view.description)} {`),
      ...sorted(view.elementIds).map((identifier) => indent(3, `include ${dslIdentifier(identifier)}`)),
      indent(3, autoLayoutStatement(view)),
      indent(2, "}"),
    ]);

  const styles = Object.entries(ELEMENT_STYLES)
    .sort(([first], [second]) => compareText(first, second))
    .flatMap(([tag, properties]) => [
      indent(3, `element ${quoteDsl(tag)} {`),
      ...properties.map((property) => indent(4, property)),
      indent(3, "}"),
    ]);

  return [
    `workspace ${quoteDsl(model?.project?.name)} ${quoteDsl(model?.project?.description)} {`,
    indent(1, "!impliedRelationships false"),
    "",
    indent(1, "model {"),
    ...(byParent.get(null) ?? []).flatMap((element) => emitElement(element, 2)),
    ...relationships,
    indent(1, "}"),
    "",
    indent(1, "views {"),
    ...views,
    indent(2, "styles {"),
    ...styles,
    indent(2, "}"),
    indent(1, "}"),
    "}",
    "",
  ].join("\n");
}

export function extractDslIdentifiers(dsl) {
  const elements = [];
  const relationships = [];
  const views = [];
  const viewMembers = {};
  let currentView = null;

  for (const sourceLine of String(dsl ?? "").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) continue;

    const element = line.match(/^([A-Za-z0-9_]+)\s*=\s*(?:person|softwareSystem|container|component)\b/);
    if (element) elements.push(canonicalIdentifier(element[1]));

    const relationship = line.match(/^([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (relationship) {
      const metadata = tokenizeDsl(relationship[3]);
      relationships.push(relationshipSemanticKey({
        from: canonicalIdentifier(relationship[1]),
        to: canonicalIdentifier(relationship[2]),
        description: unquoteDsl(metadata[0]),
        technology: unquoteDsl(metadata[1]),
      }));
    }

    const view = line.match(/^(?:systemContext|container|component)\s+[A-Za-z0-9_]+\s+(.+)\{$/);
    if (view) {
      const [key] = tokenizeDsl(view[1]);
      currentView = unquoteDsl(key);
      views.push(currentView);
      viewMembers[currentView] = [];
      continue;
    }

    if (currentView) {
      const include = line.match(/^include\s+([A-Za-z0-9_]+)$/);
      if (include) {
        viewMembers[currentView].push(canonicalIdentifier(include[1]));
        continue;
      }
      if (line === "}") currentView = null;
    }
  }

  for (const members of Object.values(viewMembers)) members.sort(compareText);
  return {
    elements: sorted(elements),
    relationships: sorted(relationships),
    views: sorted(views),
    viewMembers: Object.fromEntries(Object.entries(viewMembers).sort(([first], [second]) => compareText(first, second))),
  };
}
