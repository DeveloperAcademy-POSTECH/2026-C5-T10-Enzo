import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ELEMENT_TYPES = new Set(["Person", "Software System", "Container", "Component"]);
const CONFIDENCE_VALUES = new Set(["confirmed", "inferred", "review-required"]);
const IMPLEMENTATION_STATUS_VALUES = new Set(["active", "external", "gap", "review-required"]);
const LAYOUT_DIRECTIONS = new Set(["TopBottom", "BottomTop", "LeftRight", "RightLeft"]);
const VISUAL_ROLES_BY_TYPE = Object.freeze({
  Person: new Set(["person"]),
  "Software System": new Set(["software-system", "external-system", "data-store"]),
  Container: new Set(["application-container", "data-store"]),
  Component: new Set(["component"]),
});

export const MODEL_ISSUE_SEVERITY = Object.freeze({
  "evidence-required": "warning",
  "element-technology-required": "warning",
  "relationship-technology-required": "warning",
  "person-description-defaulted": "warning",
  "software-system-description-defaulted": "warning",
  "container-description-defaulted": "warning",
  "component-description-defaulted": "warning",
  "relationship-description-defaulted": "warning",
  "element-name-duplicate-repaired": "warning",
  "relationship-description-duplicate-repaired": "warning",
});

function normalizedString(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function dslSafeString(value, repairs, details) {
  const original = normalizedString(value);
  const normalized = original
    .replaceAll("\\n", "/n")
    .replace(/\\$/, "/")
    .replaceAll("${", "$ {");
  if (normalized !== original) {
    repairs.push({ code: "dsl-text-normalized", ...details, original, value: normalized });
  }
  return normalized;
}

function uniqueSemanticText(value, used) {
  const base = value;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base} (${suffix})`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function slug(value) {
  const result = normalizedString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return result || "element";
}

function uniqueId(candidate, used) {
  const base = slug(candidate);
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function normalizeEvidence(items) {
  if (!Array.isArray(items)) return [];
  const normalized = items
    .map((item) => {
      if (typeof item === "string") {
        const [file, line] = item.split(":");
        return { file: normalizedString(file), ...(Number(line) ? { line: Number(line) } : {}), reason: "Source evidence" };
      }
      if (!item || typeof item !== "object") return null;
      const file = normalizedString(item.file);
      if (!file) return null;
      return {
        file,
        ...(Number.isFinite(Number(item.line)) ? { line: Number(item.line) } : {}),
        ...(normalizedString(item.symbol) ? { symbol: normalizedString(item.symbol) } : {}),
        reason: normalizedString(item.reason) || "Source evidence",
      };
    })
    .filter(Boolean);
  return [...new Map(normalized.map((item) => [JSON.stringify([item.file, item.line ?? "", item.symbol ?? "", item.reason]), item])).values()];
}

function normalizeElementTag(value, repairs, elementId, index) {
  const original = dslSafeString(value, repairs, { field: "element.tags", elementId, index });
  const normalized = original.replaceAll(",", ";");
  if (normalized !== original) {
    repairs.push({ code: "element-tag-comma-normalized", elementId, index, original, value: normalized });
  }
  return normalized;
}

function normalizeStringList(items) {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map(normalizedString).filter(Boolean))];
}

function normalizeIoEntries(items) {
  if (!Array.isArray(items)) return [];
  const normalized = items.map((item) => {
    if (typeof item === "string") return { name: normalizedString(item), evidence: [] };
    if (!item || typeof item !== "object") return null;
    const name = normalizedString(item.name ?? item.label ?? item.description);
    if (!name) return null;
    return { name, evidence: normalizeEvidence(item.evidence) };
  }).filter(Boolean);
  return [...new Map(normalized.map((item) => [item.name.toLowerCase(), item])).values()];
}

function defaultVisualRole(element) {
  if (element.type === "Person") return "person";
  if (element.type === "Software System") return element.external ? "external-system" : "software-system";
  if (element.type === "Container") return element.dataStore || /data[ -]?store|database|persistence/i.test(element.visualRole) ? "data-store" : "application-container";
  return "component";
}

export function deriveElementTags(element) {
  return ["Element", element.type, element.visualRole || defaultVisualRole(element)];
}

export function normalizeLayoutConfiguration(value = {}) {
  return {
    direction: LAYOUT_DIRECTIONS.has(value.direction) ? value.direction : "LeftRight",
    rankSeparation: Math.max(112, Number(value.rankSeparation) || 176),
    nodeSeparation: Math.max(72, Number(value.nodeSeparation) || 280),
    relationshipSeparation: Math.max(28, Number(value.relationshipSeparation) || 36),
  };
}

function unknownDescription(language, type) {
  return language === "ko" ? `${type}의 책임을 소스에서 확인하지 못했습니다.` : `The responsibility of this ${type} was not confirmed in source.`;
}

function issue(code, message, details = {}) {
  return { severity: MODEL_ISSUE_SEVERITY[code] ?? "error", code, message, ...details };
}

function validVisualRole(element) {
  if (!VISUAL_ROLES_BY_TYPE[element.type]?.has(element.visualRole)) return false;
  if (element.type === "Software System" && element.visualRole === "external-system" && !element.external) return false;
  if (element.type === "Software System" && element.visualRole === "software-system" && element.external) return false;
  return true;
}

function validLayoutConfiguration(value) {
  return value
    && LAYOUT_DIRECTIONS.has(value.direction)
    && Number.isFinite(value.rankSeparation) && value.rankSeparation >= 112
    && Number.isFinite(value.nodeSeparation) && value.nodeSeparation >= 72
    && Number.isFinite(value.relationshipSeparation) && value.relationshipSeparation >= 28;
}

function viewRelationships(relationships, elementIds) {
  const visible = new Set(elementIds);
  return relationships.filter(({ from, to }) => visible.has(from) && visible.has(to)).map(({ id }) => id);
}

function buildViews(model) {
  const internalSystems = model.elements.filter(({ type, external }) => type === "Software System" && !external);
  const scope = internalSystems[0];
  if (!scope) return [];
  const byId = new Map(model.elements.map((element) => [element.id, element]));
  const views = [];

  const l1Support = new Set();
  for (const relationship of model.relationships) {
    const otherId = relationship.from === scope.id ? relationship.to : relationship.to === scope.id ? relationship.from : null;
    const other = byId.get(otherId);
    if (other && (other.type === "Person" || (other.type === "Software System" && other.external))) l1Support.add(other.id);
  }
  const l1Elements = [scope.id, ...l1Support].sort();
  views.push({
    id: `${scope.id}-system-context`,
    level: 1,
    scopeId: scope.id,
    title: `${scope.name} — System Context`,
    description: `People and external systems directly connected to ${scope.name}.`,
    elementIds: l1Elements,
    relationshipIds: viewRelationships(model.relationships, l1Elements),
  });

  const containers = model.elements.filter(({ type, parentId }) => type === "Container" && parentId === scope.id);
  const containerIds = new Set(containers.map(({ id }) => id));
  const l2Support = new Set();
  for (const relationship of model.relationships) {
    const endpoints = [relationship.from, relationship.to];
    if (!endpoints.some((id) => containerIds.has(id))) continue;
    for (const endpoint of endpoints) {
      const element = byId.get(endpoint);
      if (element && (element.type === "Person" || (element.type === "Software System" && element.external))) l2Support.add(endpoint);
    }
  }
  const l2Elements = [...containerIds, ...l2Support].sort();
  views.push({
    id: `${scope.id}-containers`,
    level: 2,
    scopeId: scope.id,
    title: `${scope.name} — Containers`,
    description: `Runtime and data boundaries inside ${scope.name}.`,
    elementIds: l2Elements,
    relationshipIds: viewRelationships(model.relationships, l2Elements),
  });

  for (const container of containers) {
    const components = model.elements.filter(({ type, parentId }) => type === "Component" && parentId === container.id);
    if (components.length === 0) continue;
    const componentIds = new Set(components.map(({ id }) => id));
    const support = new Set();
    for (const relationship of model.relationships) {
      const endpoints = [relationship.from, relationship.to];
      if (!endpoints.some((id) => componentIds.has(id))) continue;
      for (const endpoint of endpoints) {
        if (componentIds.has(endpoint)) continue;
        const element = byId.get(endpoint);
        if (element && ["Person", "Software System", "Container"].includes(element.type)) support.add(endpoint);
      }
    }
    const elementIds = [...componentIds, ...support].sort();
    views.push({
      id: `${container.id}-components`,
      level: 3,
      scopeId: container.id,
      title: `${container.name} — Components`,
      description: `Cohesive responsibilities inside ${container.name}.`,
      elementIds,
      relationshipIds: viewRelationships(model.relationships, elementIds),
    });
  }

  return views.map((view) => ({
    ...view,
    layoutConfiguration: normalizeLayoutConfiguration(view.layoutConfiguration),
  }));
}

export function validateC4Model(model) {
  const issues = [];
  const elements = Array.isArray(model?.elements) ? model.elements : [];
  const relationships = Array.isArray(model?.relationships) ? model.relationships : [];
  const views = Array.isArray(model?.views) ? model.views : [];
  const elementIds = new Set();
  const topLevelNames = new Set();
  const byId = new Map(elements.map((element) => [element.id, element]));

  for (const element of elements) {
    if (!element.id || elementIds.has(element.id)) issues.push(issue("element-id-invalid", "Element IDs must be present and unique.", { elementId: element.id }));
    elementIds.add(element.id);
    if (!ELEMENT_TYPES.has(element.type)) issues.push(issue("element-type-invalid", "Unknown C4 element type.", { elementId: element.id }));
    if (!normalizedString(element.name)) issues.push(issue("element-name-required", "Element name is required.", { elementId: element.id }));
    if (["Person", "Software System"].includes(element.type)) {
      const nameKey = normalizedString(element.name);
      if (topLevelNames.has(nameKey)) issues.push(issue("element-name-duplicate-invalid", "Top-level Person and Software System names must be unique.", { elementId: element.id }));
      topLevelNames.add(nameKey);
    }
    if (!normalizedString(element.description)) issues.push(issue("element-description-required", "Element description is required.", { elementId: element.id }));
    if (["Container", "Component"].includes(element.type) && !normalizedString(element.technology)) issues.push(issue("element-technology-required", "Container and Component technology is required.", { elementId: element.id }));
    if (!CONFIDENCE_VALUES.has(element.confidence)) issues.push(issue("confidence-invalid", "Element confidence is invalid.", { elementId: element.id }));
    if (!IMPLEMENTATION_STATUS_VALUES.has(element.implementationStatus)) issues.push(issue("element-implementation-status-invalid", "Element implementation status is invalid.", { elementId: element.id }));
    if (!Array.isArray(element.evidence) || element.evidence.length === 0) issues.push(issue("evidence-required", "Element source evidence is required.", { elementId: element.id }));
    if (["Person", "Software System"].includes(element.type) && normalizedString(element.parentId)) issues.push(issue("element-parent-invalid", "Person and Software System elements must be top-level.", { elementId: element.id }));
    if (element.type === "Container" && byId.get(element.parentId)?.type !== "Software System") issues.push(issue("element-parent-invalid", "Container parent must be a Software System.", { elementId: element.id }));
    if (element.type === "Component" && byId.get(element.parentId)?.type !== "Container") issues.push(issue("element-parent-invalid", "Component parent must be a Container.", { elementId: element.id }));
    if (!validVisualRole(element)) issues.push(issue("element-visual-role-invalid", "Element visual role is incompatible with its C4 type and ownership.", { elementId: element.id }));
    const requiredTags = deriveElementTags(element);
    if (!Array.isArray(element.tags) || requiredTags.some((tag) => !element.tags.includes(tag))) {
      issues.push(issue("element-tags-required", "Element tags must include its canonical C4 type and visual role.", { elementId: element.id }));
    }
  }

  const relationshipIds = new Set();
  const directedRelationshipDescriptions = new Set();
  for (const relationship of relationships) {
    if (!relationship.id || relationshipIds.has(relationship.id)) issues.push(issue("relationship-id-invalid", "Relationship IDs must be present and unique.", { relationshipId: relationship.id }));
    relationshipIds.add(relationship.id);
    const from = byId.get(relationship.from);
    const to = byId.get(relationship.to);
    if (!from || !to) issues.push(issue("relationship-dangling", "Relationship endpoints must exist.", { relationshipId: relationship.id }));
    if (!normalizedString(relationship.description)) issues.push(issue("relationship-description-required", "Relationship description is required.", { relationshipId: relationship.id }));
    const descriptionKey = JSON.stringify([relationship.from, relationship.to, normalizedString(relationship.description)]);
    if (directedRelationshipDescriptions.has(descriptionKey)) issues.push(issue("relationship-description-duplicate-invalid", "Relationship descriptions must be unique for each directed endpoint pair.", { relationshipId: relationship.id }));
    directedRelationshipDescriptions.add(descriptionKey);
    if (!CONFIDENCE_VALUES.has(relationship.confidence)) issues.push(issue("confidence-invalid", "Relationship confidence is invalid.", { relationshipId: relationship.id }));
    if (!Array.isArray(relationship.evidence) || relationship.evidence.length === 0) issues.push(issue("evidence-required", "Relationship source evidence is required.", { relationshipId: relationship.id }));
    if (from?.type === "Container" && to?.type === "Container" && from.id !== to.id && !normalizedString(relationship.technology)) {
      issues.push(issue("relationship-technology-required", "Inter-container relationships require technology or protocol.", { relationshipId: relationship.id }));
    }
  }

  const viewIds = new Set();
  for (const view of views) {
    if (!view.id || viewIds.has(view.id)) issues.push(issue("view-id-invalid", "View IDs must be present and unique.", { viewId: view.id }));
    viewIds.add(view.id);
    if (![1, 2, 3].includes(view.level)) issues.push(issue("view-level-invalid", "Only C4 levels 1, 2, and 3 are supported.", { viewId: view.id }));
    const scope = byId.get(view.scopeId);
    if (!scope) issues.push(issue("view-scope-invalid", "View scope must reference an element.", { viewId: view.id }));
    if ((view.level === 1 || view.level === 2) && (scope?.type !== "Software System" || scope.external)) issues.push(issue("view-scope-invalid", "L1 and L2 views must scope an internal Software System.", { viewId: view.id }));
    if (view.level === 3 && scope?.type !== "Container") issues.push(issue("view-scope-invalid", "L3 views must scope a Container.", { viewId: view.id }));
    if (!validLayoutConfiguration(view.layoutConfiguration)) issues.push(issue("view-layout-configuration-invalid", "View layout configuration must use a supported direction and finite minimum spacing.", { viewId: view.id }));
    if (new Set(view.elementIds ?? []).size !== (view.elementIds ?? []).length) issues.push(issue("view-element-duplicate-invalid", "View element IDs must be unique.", { viewId: view.id }));
    if (new Set(view.relationshipIds ?? []).size !== (view.relationshipIds ?? []).length) issues.push(issue("view-relationship-duplicate-invalid", "View relationship IDs must be unique.", { viewId: view.id }));
    for (const elementId of view.elementIds ?? []) if (!byId.has(elementId)) issues.push(issue("view-element-dangling", "View references a missing element.", { viewId: view.id, elementId }));
    for (const elementId of view.elementIds ?? []) {
      const element = byId.get(elementId);
      const validAtLevel = view.level === 1
        ? element && (element.type === "Person" || element.type === "Software System" && (element.external || element.id === view.scopeId))
        : view.level === 2
          ? element && (element.type === "Person" || element.type === "Software System" && element.external || element.type === "Container" && element.parentId === view.scopeId)
          : element && (element.type === "Person" || element.type === "Software System" || element.type === "Container" || element.type === "Component" && element.parentId === view.scopeId);
      if (!validAtLevel) issues.push(issue("view-abstraction-invalid", "View element membership does not match its C4 abstraction level and scope.", { viewId: view.id, elementId }));
    }
    const visible = new Set(view.elementIds ?? []);
    for (const relationshipId of view.relationshipIds ?? []) {
      const relationship = relationships.find(({ id }) => id === relationshipId);
      if (!relationship || !visible.has(relationship.from) || !visible.has(relationship.to)) issues.push(issue("view-relationship-invalid", "View relationship endpoints must both be visible.", { viewId: view.id, relationshipId }));
    }
  }

  return issues;
}

export function normalizeC4Model(rawModel = {}, scanResult = {}) {
  const raw = structuredClone(rawModel ?? {});
  const language = normalizedString(raw.project?.language) || "en";
  const repairs = [];
  const issues = [];
  const usedElementIds = new Set();
  const elements = [];

  for (const source of Array.isArray(raw.elements) ? raw.elements : []) {
    const type = normalizedString(source.type);
    if (!ELEMENT_TYPES.has(type)) {
      repairs.push({ code: "element-type-invalid-removed", originalType: type });
      continue;
    }
    let id = normalizedString(source.id);
    if (!id) {
      id = uniqueId(`${type}-${source.name}`, usedElementIds);
      repairs.push({ code: "element-id-generated", elementId: id });
    }
    if (usedElementIds.has(id)) {
      repairs.push({ code: "element-duplicate-removed", elementId: id });
      continue;
    }
    usedElementIds.add(id);
    const description = dslSafeString(source.description, repairs, { field: "element.description", elementId: id });
    const sourceTechnology = normalizedString(source.technology);
    const technology = ["Container", "Component"].includes(type)
      ? dslSafeString(source.technology, repairs, { field: "element.technology", elementId: id })
      : "";
    if (!["Container", "Component"].includes(type) && sourceTechnology) {
      repairs.push({ code: "element-technology-removed", elementId: id, type, original: sourceTechnology });
    }
    const sourceParentId = normalizedString(source.parentId);
    if (["Person", "Software System"].includes(type) && sourceParentId) {
      repairs.push({ code: "element-top-level-parent-removed", elementId: id, parentId: sourceParentId });
    }
    const element = {
      id,
      type,
      name: dslSafeString(source.name, repairs, { field: "element.name", elementId: id }) || id,
      description: description || unknownDescription(language, type),
      ...(["Container", "Component"].includes(type) && sourceParentId ? { parentId: sourceParentId } : {}),
      ...(["Container", "Component"].includes(type) ? { technology: technology || "Unknown" } : technology ? { technology } : {}),
      ...(Boolean(source.external) ? { external: true } : {}),
      responsibilities: normalizeStringList(source.responsibilities),
      inputs: normalizeIoEntries(source.inputs),
      outputs: normalizeIoEntries(source.outputs),
      implementationStatus: IMPLEMENTATION_STATUS_VALUES.has(normalizedString(source.implementationStatus))
        ? normalizedString(source.implementationStatus)
        : source.external ? "external" : "active",
      ...(normalizedString(source.evidenceSummary) ? { evidenceSummary: normalizedString(source.evidenceSummary) } : {}),
      ...(Array.isArray(source.excludedCandidates) ? { excludedCandidates: structuredClone(source.excludedCandidates) } : {}),
      evidence: normalizeEvidence(source.evidence),
      confidence: description && CONFIDENCE_VALUES.has(source.confidence) ? source.confidence : "review-required",
    };
    const requestedVisualRole = normalizedString(source.visualRole);
    element.visualRole = requestedVisualRole || defaultVisualRole({ ...source, ...element });
    if (!validVisualRole(element)) {
      const replacement = defaultVisualRole(element);
      repairs.push({ code: "element-visual-role-repaired", elementId: id, original: element.visualRole, value: replacement });
      element.visualRole = replacement;
    }
    element.tags = [...new Set([
      ...deriveElementTags(element),
      ...(Array.isArray(source.tags)
        ? source.tags.map((tag, index) => normalizeElementTag(tag, repairs, id, index)).filter(Boolean)
        : []),
    ])];
    if (!description) {
      const code = `${type.toLowerCase().replace(/\s+/g, "-")}-description-defaulted`;
      repairs.push({ code, elementId: id });
      issues.push(issue(code, "Missing description was defaulted.", { elementId: id }));
    }
    if (element.evidence.length === 0) issues.push(issue("evidence-required", "Element has no source evidence.", { elementId: id }));
    elements.push(element);
  }

  const initialById = new Map(elements.map((element) => [element.id, element]));
  const parentValidity = new Map();
  function hasValidParent(element) {
    if (parentValidity.has(element.id)) return parentValidity.get(element.id);
    const parent = initialById.get(element.parentId);
    const valid = element.type === "Container"
      ? parent?.type === "Software System" && hasValidParent(parent)
      : element.type === "Component"
        ? parent?.type === "Container" && hasValidParent(parent)
        : true;
    parentValidity.set(element.id, valid);
    return valid;
  }
  const validElements = elements.filter((element) => {
    if (!hasValidParent(element)) {
      repairs.push({ code: "element-invalid-parent-removed", elementId: element.id });
      return false;
    }
    return true;
  });
  const usedTopLevelNames = new Set();
  for (const element of validElements) {
    if (!["Person", "Software System"].includes(element.type)) continue;
    const original = element.name;
    element.name = uniqueSemanticText(original, usedTopLevelNames);
    if (element.name !== original) {
      const details = { elementId: element.id, original, value: element.name };
      repairs.push({ code: "element-name-duplicate-repaired", ...details });
      issues.push(issue("element-name-duplicate-repaired", "Duplicate top-level name was repaired for Structurizr compatibility.", details));
    }
  }
  const byId = new Map(validElements.map((element) => [element.id, element]));
  const usedRelationshipIds = new Set();
  const duplicateRelationships = new Map();
  const directedRelationshipDescriptions = new Set();
  const relationships = [];

  for (const source of Array.isArray(raw.relationships) ? raw.relationships : []) {
    const from = normalizedString(source.from);
    const to = normalizedString(source.to);
    if (!byId.has(from) || !byId.has(to)) {
      repairs.push({ code: "relationship-dangling-removed", relationshipId: normalizedString(source.id), from, to });
      continue;
    }
    const description = dslSafeString(source.description, repairs, { field: "relationship.description", relationshipId: normalizedString(source.id) });
    const technology = dslSafeString(source.technology, repairs, { field: "relationship.technology", relationshipId: normalizedString(source.id) });
    const effectiveDescription = description || unknownDescription(language, "relationship");
    const senderEvidence = normalizeEvidence(source.senderEvidence);
    const receiverEvidence = normalizeEvidence(source.receiverEvidence);
    const relationshipEvidence = normalizeEvidence([...(source.evidence ?? []), ...senderEvidence, ...receiverEvidence]);
    const duplicateKey = JSON.stringify([from, to, effectiveDescription, technology]);
    const duplicateSurvivor = duplicateRelationships.get(duplicateKey);
    if (duplicateSurvivor) {
      duplicateSurvivor.senderEvidence = normalizeEvidence([...duplicateSurvivor.senderEvidence, ...senderEvidence]);
      duplicateSurvivor.receiverEvidence = normalizeEvidence([...duplicateSurvivor.receiverEvidence, ...receiverEvidence]);
      duplicateSurvivor.evidence = normalizeEvidence([...duplicateSurvivor.evidence, ...relationshipEvidence]);
      repairs.push({
        code: "relationship-duplicate-removed",
        relationshipId: normalizedString(source.id),
        survivorRelationshipId: duplicateSurvivor.id,
      });
      continue;
    }
    let id = normalizedString(source.id);
    if (!id || usedRelationshipIds.has(id)) {
      id = uniqueId(`${from}-${to}-${description || "relationship"}`, usedRelationshipIds);
      repairs.push({ code: "relationship-id-generated", relationshipId: id });
    }
    usedRelationshipIds.add(id);
    const uniqueDescription = uniqueSemanticText(effectiveDescription, {
      has: (candidate) => directedRelationshipDescriptions.has(JSON.stringify([from, to, candidate])),
      add: (candidate) => directedRelationshipDescriptions.add(JSON.stringify([from, to, candidate])),
    });
    if (uniqueDescription !== effectiveDescription) {
      const details = { relationshipId: id, from, to, original: effectiveDescription, value: uniqueDescription };
      repairs.push({ code: "relationship-description-duplicate-repaired", ...details });
      issues.push(issue("relationship-description-duplicate-repaired", "Duplicate directed relationship description was repaired for Structurizr compatibility.", details));
    }
    const relationship = {
      id,
      from,
      to,
      description: uniqueDescription,
      ...(technology ? { technology } : {}),
      ...(normalizedString(source.purpose) ? { purpose: normalizedString(source.purpose) } : {}),
      ...(normalizedString(source.payload) ? { payload: normalizedString(source.payload) } : {}),
      senderEvidence,
      receiverEvidence,
      evidence: relationshipEvidence,
      confidence: description && CONFIDENCE_VALUES.has(source.confidence) ? source.confidence : "review-required",
    };
    if (!description) {
      repairs.push({ code: "relationship-description-defaulted", relationshipId: id });
      issues.push(issue("relationship-description-defaulted", "Missing relationship description was defaulted.", { relationshipId: id }));
    }
    if (byId.get(from).type === "Container" && byId.get(to).type === "Container" && !technology) {
      issues.push(issue("relationship-technology-required", "Inter-container relationships require technology or protocol.", { relationshipId: id }));
    }
    relationships.push(relationship);
    duplicateRelationships.set(duplicateKey, relationship);
  }
  for (const relationship of relationships) {
    if (relationship.evidence.length === 0) {
      issues.push(issue("evidence-required", "Relationship has no source evidence.", { relationshipId: relationship.id }));
    }
  }

  const model = {
    version: "1.0.0",
    project: {
      name: dslSafeString(raw.project?.name, repairs, { field: "project.name" })
        || dslSafeString(scanResult.project?.name, repairs, { field: "project.name" })
        || "Unknown Apple Project",
      description: dslSafeString(raw.project?.description, repairs, { field: "project.description" }) || unknownDescription(language, "project"),
      language,
    },
    elements: validElements,
    relationships,
    excludedCandidates: Array.isArray(raw.excludedCandidates) ? structuredClone(raw.excludedCandidates) : [],
    views: [],
  };
  model.views = buildViews(model);
  issues.push(...validateC4Model(model));

  const uniqueIssues = [...new Map(issues.map((item) => [[item.code, item.elementId, item.relationshipId, item.viewId].join("|"), item])).values()];
  return { model, repairs, issues: uniqueIssues };
}

async function writeJsonAtomic(outputPath, value) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, absolute);
}

export async function runNormalizeCli(args = process.argv.slice(2), io = console) {
  const [rawModelPath, scanResultPath, modelOutputPath, inspectionOutputPath] = args;
  if (!rawModelPath || !scanResultPath || !modelOutputPath || !inspectionOutputPath) {
    io.error("Usage: normalize-c4-model.mjs <raw-model-json> <scan-result-json> <normalized-model-json> <inspection-json>");
    return 2;
  }
  try {
    const rawModel = JSON.parse(await fs.readFile(rawModelPath, "utf8"));
    const scanResult = JSON.parse(await fs.readFile(scanResultPath, "utf8"));
    const result = normalizeC4Model(rawModel, scanResult);
    await writeJsonAtomic(modelOutputPath, result.model);
    await writeJsonAtomic(inspectionOutputPath, { repairs: result.repairs, issues: result.issues });
    return 0;
  } catch (error) {
    io.error(error.message);
    return ["ENOENT", "EACCES"].includes(error.code) || error instanceof SyntaxError ? 2 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runNormalizeCli();
}
