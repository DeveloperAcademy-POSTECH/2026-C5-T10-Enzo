const ENCODED_IDENTIFIER = /^c4id_([0-9a-f]+)$/i;

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

export function dslIdentifier(identifier) {
  const value = String(identifier ?? "");
  return `c4id_${Buffer.from(value, "utf8").toString("hex")}`;
}

export function canonicalIdentifier(identifier) {
  const match = String(identifier ?? "").match(ENCODED_IDENTIFIER);
  if (!match || match[1].length % 2 !== 0) return String(identifier ?? "");
  return Buffer.from(match[1], "hex").toString("utf8");
}

export function tokenizeStructurizrDsl(value) {
  const source = String(value ?? "").trim();
  const tokens = [];
  let token = "";
  let tokenStarted = false;
  let quoted = false;

  const appendToken = () => {
    if (tokenStarted) tokens.push(token);
    token = "";
    tokenStarted = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (index > 0 && source[index - 1] === "\\") {
        token += character;
        tokenStarted = true;
      } else if (quoted) {
        appendToken();
        quoted = false;
      } else {
        quoted = true;
        tokenStarted = true;
      }
    } else if (/\s/.test(character) && !quoted) {
      appendToken();
    } else {
      token += character;
      tokenStarted = true;
    }
  }
  appendToken();

  // Mirrors Tokens.get(): only escaped quotes and \n sequences are decoded.
  return tokens.map((item) => item.replaceAll('\\"', '"').replaceAll("\\n", "\n"));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function autoLayoutSemantic(view) {
  const configuration = view?.layoutConfiguration ?? {};
  return {
    direction: DIRECTION_KEYWORDS[configuration.direction] ?? "lr",
    rankSeparation: positiveInteger(configuration.rankSeparation, 176),
    nodeSeparation: positiveInteger(configuration.nodeSeparation, 280),
  };
}

export function quoteDsl(value) {
  const escaped = String(value ?? "")
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

export function c4SemanticProjection(model) {
  const kind = VIEW_KEYWORDS;
  return {
    workspace: {
      name: String(model?.project?.name ?? ""),
      description: String(model?.project?.description ?? ""),
    },
    impliedRelationships: ["false"],
    elements: (model?.elements ?? []).map((element) => ({
      id: String(element.id ?? ""),
      type: String(element.type ?? ""),
      parentId: element.parentId ?? null,
      name: String(element.name ?? ""),
      description: String(element.description ?? ""),
      technology: String(element.technology ?? ""),
      tags: sorted(element.tags),
    })).sort((first, second) => compareText(first.id, second.id)),
    relationships: sorted((model?.relationships ?? []).map(relationshipSemanticKey)),
    views: (model?.views ?? []).map((view) => ({
      id: String(view.id ?? ""),
      level: Number(view.level),
      kind: kind[view.level] ?? "",
      scopeId: String(view.scopeId ?? ""),
      description: String(view.description ?? ""),
      elementIds: sorted(view.elementIds),
      autoLayout: autoLayoutSemantic(view),
    })).sort((first, second) => compareText(first.id, second.id)),
  };
}

function elementMetadata(element) {
  const tags = quoteDsl(sorted(element.tags).join(","));
  if (element.type === "Person" || element.type === "Software System") {
    return [quoteDsl(element.name), quoteDsl(element.description), tags].join(" ");
  }
  return [quoteDsl(element.name), quoteDsl(element.description), quoteDsl(element.technology), tags].join(" ");
}

function autoLayoutStatement(view) {
  const { direction, rankSeparation, nodeSeparation } = autoLayoutSemantic(view);
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
      indent(2, `${VIEW_KEYWORDS[view.level]} ${dslIdentifier(view.scopeId)} ${dslIdentifier(view.id)} ${quoteDsl(view.description)} {`),
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
  const workspace = { name: "", description: "" };
  const impliedRelationships = [];
  const elements = [];
  const relationships = [];
  const views = [];
  let currentView = null;
  let section = null;
  const elementStack = [];

  const canonicalType = Object.fromEntries(Object.entries(TYPE_KEYWORDS).map(([type, keyword]) => [keyword, type]));
  const canonicalLevel = Object.fromEntries(Object.entries(VIEW_KEYWORDS).map(([level, keyword]) => [keyword, Number(level)]));

  for (const sourceLine of String(dsl ?? "").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) continue;
    const tokens = tokenizeStructurizrDsl(line);

    if (tokens[0] === "workspace") {
      workspace.name = tokens[1] ?? "";
      workspace.description = tokens[2] ?? "";
      continue;
    }
    if (tokens[0] === "!impliedRelationships") {
      impliedRelationships.push(tokens[1] ?? "");
      continue;
    }
    if (line === "model {") {
      section = "model";
      continue;
    }
    if (line === "views {") {
      section = "views";
      continue;
    }

    if (section === "model" && tokens[1] === "=" && canonicalType[tokens[2]]) {
      const type = canonicalType[tokens[2]];
      const hasTechnology = type === "Container" || type === "Component";
      elements.push({
        id: canonicalIdentifier(tokens[0]),
        type,
        parentId: elementStack.at(-1) ?? null,
        name: tokens[3] ?? "",
        description: tokens[4] ?? "",
        technology: hasTechnology ? tokens[5] ?? "" : "",
        tags: (tokens[hasTechnology ? 6 : 5] ?? "").split(",").filter(Boolean).sort(compareText),
      });
      if (line.endsWith("{")) elementStack.push(canonicalIdentifier(tokens[0]));
      continue;
    }

    if (section === "model" && tokens[1] === "->") {
      relationships.push(relationshipSemanticKey({
        from: canonicalIdentifier(tokens[0]),
        to: canonicalIdentifier(tokens[2]),
        description: tokens[3] ?? "",
        technology: tokens[4] ?? "",
      }));
      continue;
    }

    if (section === "views" && canonicalLevel[tokens[0]] && line.endsWith("{")) {
      currentView = {
        id: canonicalIdentifier(tokens[2]),
        level: canonicalLevel[tokens[0]],
        kind: tokens[0],
        scopeId: canonicalIdentifier(tokens[1]),
        description: tokens[3] ?? "",
        elementIds: [],
        autoLayout: null,
      };
      views.push(currentView);
      continue;
    }

    if (currentView) {
      if (tokens[0] === "include" && tokens.length === 2) {
        currentView.elementIds.push(canonicalIdentifier(tokens[1]));
        continue;
      }
      if (tokens[0] === "autoLayout") {
        currentView.autoLayout = {
          direction: tokens[1] ?? "",
          rankSeparation: Number(tokens[2]),
          nodeSeparation: Number(tokens[3]),
        };
        continue;
      }
      if (line === "}") currentView = null;
      continue;
    }

    if (section === "model" && line === "}") {
      if (elementStack.length > 0) elementStack.pop();
      else section = null;
    }
  }

  for (const view of views) view.elementIds.sort(compareText);
  return {
    workspace,
    impliedRelationships,
    elements: [...elements].sort((first, second) => compareText(first.id, second.id)),
    relationships: sorted(relationships),
    views: [...views].sort((first, second) => compareText(first.id, second.id)),
  };
}
