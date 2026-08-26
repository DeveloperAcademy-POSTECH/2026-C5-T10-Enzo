import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateC4Output,
  writeValidationReport,
} from "./validate-c4-output.mjs";
import { scanXcodeProject } from "./scan-xcode-project.mjs";
import { normalizeC4Model } from "./normalize-c4-model.mjs";
import { layoutC4Model } from "./layout-c4-model.mjs";
import { synthesizeC4Model } from "./synthesize-c4-model.mjs";
import { exportStructurizrDsl } from "./export-structurizr-dsl.mjs";

const DEFAULT_SHELL_PATH = fileURLToPath(new URL("../assets/c4-explorer-shell.html", import.meta.url));

function fileSlug(value) {
  return String(value ?? "project")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

export function escapeJsonForHtml(value) {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

async function writeAtomic(outputPath, content) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, absolute);
  return absolute;
}

function evidenceFrom(value, fallbackFile) {
  const source = value?.evidence ?? value;
  return [{
    file: source?.file || fallbackFile,
    ...(Number.isFinite(Number(source?.line)) ? { line: Number(source.line) } : {}),
    ...(source?.symbol ? { symbol: source.symbol } : {}),
    reason: source?.reason || "Confirmed project structure",
  }];
}

function applicationTechnology(target) {
  const platform = {
    "ios-app": "iOS",
    "watch-app": "watchOS",
    "macos-app": "macOS",
    "tvos-app": "tvOS",
    "visionos-app": "visionOS",
    extension: "Apple extension",
  }[target.runtimeKind] ?? "Apple runtime";
  return `Swift · ${platform}`;
}

function conservativeFallbackModel(scan, language) {
  const isKorean = language === "ko";
  const projectName = scan.project?.name || "Apple Project";
  const systemId = fileSlug(projectName);
  const personEvidence = evidenceFrom(scan.targets[0], scan.files[0]?.path || "project.pbxproj");
  const applicationTargets = scan.targets.filter(({ runtimeKind, productType }) =>
    runtimeKind?.endsWith("app") || /application|extension/i.test(productType ?? ""));
  const elements = [
    {
      id: "user",
      type: "Person",
      name: isKorean ? "사용자" : "User",
      description: isKorean ? `${projectName}의 확인된 애플리케이션 기능을 사용합니다.` : `Uses the confirmed application capabilities of ${projectName}.`,
      evidence: personEvidence,
      confidence: "review-required",
    },
    {
      id: systemId,
      type: "Software System",
      name: projectName,
      description: isKorean ? "소스에서 확인된 Apple 애플리케이션 경계를 나타냅니다." : "Represents the Apple application boundary confirmed in source.",
      evidence: personEvidence,
      confidence: "review-required",
    },
  ];
  const relationships = [{
    id: "user-uses-system",
    from: "user",
    to: systemId,
    description: isKorean ? "애플리케이션을 사용합니다." : "Uses the application.",
    evidence: personEvidence,
    confidence: "review-required",
  }];
  const containers = [];

  for (const [index, target] of applicationTargets.entries()) {
    const targetId = fileSlug(`${target.name || `application-${index + 1}`}-${target.runtimeKind || "app"}`);
    const uniqueTargetId = containers.some(({ id }) => id === targetId) ? `${targetId}-${index + 1}` : targetId;
    const targetEvidence = evidenceFrom(target, scan.files.find(({ kind }) => kind === "xcode-project")?.path);
    const entry = scan.declarations.find((declaration) =>
      declaration.targetNames?.includes(target.name) && (declaration.attributes?.includes("@main") || declaration.conformances?.includes("App")));
    const componentEvidence = evidenceFrom(entry, targetEvidence[0].file);
    const componentId = `${uniqueTargetId}-entry-responsibility`;
    const container = {
      id: uniqueTargetId,
      parentId: systemId,
      type: "Container",
      name: target.name || (isKorean ? "Apple 애플리케이션" : "Apple Application"),
      description: isKorean ? `${target.runtimeKind || "Apple"} 실행 경계입니다.` : `The ${target.runtimeKind || "Apple"} runtime boundary.`,
      technology: applicationTechnology(target),
      evidence: targetEvidence,
      confidence: "review-required",
    };
    containers.push(container);
    elements.push(container, {
      id: componentId,
      parentId: uniqueTargetId,
      type: "Component",
      name: entry?.name || (isKorean ? "애플리케이션 진입 책임" : "Application Entry Responsibility"),
      description: isKorean ? "소스에서 확인된 애플리케이션 진입과 초기 구성을 담당합니다." : "Owns the confirmed application entry and initial composition.",
      technology: "Swift",
      evidence: componentEvidence,
      confidence: "review-required",
    });
    relationships.push(
      {
        id: `user-uses-${uniqueTargetId}`,
        from: "user",
        to: uniqueTargetId,
        description: isKorean ? "기능을 사용합니다." : "Uses its capabilities.",
        evidence: targetEvidence,
        confidence: "review-required",
      },
      {
        id: `user-uses-${componentId}`,
        from: "user",
        to: componentId,
        description: isKorean ? "애플리케이션 흐름을 시작합니다." : "Starts the application flow.",
        technology: "Apple UI",
        evidence: componentEvidence,
        confidence: "review-required",
      },
    );
  }

  const persistence = scan.interactions.filter(({ kind }) => kind === "persistence-write" || kind === "persistence-read");
  if (persistence.length > 0) {
    const storeEvidence = evidenceFrom(persistence[0], personEvidence[0].file);
    const storeId = `${systemId}-owned-store`;
    elements.push({
      id: storeId,
      parentId: systemId,
      type: "Container",
      name: isKorean ? "애플리케이션 데이터 저장소" : "Application Data Store",
      description: isKorean ? "직접 확인된 로컬 읽기와 쓰기를 소유합니다." : "Owns directly observed local reads and writes.",
      technology: [...new Set(persistence.map(({ technology }) => technology).filter(Boolean))].join(" · ") || "Local persistence",
      visualRole: "data-store",
      evidence: storeEvidence,
      confidence: "review-required",
    });
    for (const container of containers.filter((candidate) => persistence.some(({ targetNames }) => targetNames?.includes(candidate.name)))) {
      const interaction = persistence.find(({ targetNames }) => targetNames?.includes(container.name)) ?? persistence[0];
      relationships.push({
        id: `${container.id}-uses-${storeId}`,
        from: container.id,
        to: storeId,
        description: isKorean ? "애플리케이션 데이터를 읽고 씁니다." : "Reads and writes application data.",
        technology: interaction.technology || "Local persistence",
        evidence: evidenceFrom(interaction, storeEvidence[0].file),
        confidence: "review-required",
      });
    }
  }

  const network = scan.interactions.filter(({ kind }) => kind === "network-request");
  if (network.length > 0) {
    const externalId = "unresolved-external-service";
    elements.push({
      id: externalId,
      type: "Software System",
      external: true,
      name: isKorean ? "확인 필요 외부 서비스" : "External Service To Review",
      description: isKorean ? "직접 네트워크 호출은 확인됐지만 서비스 정체는 확인되지 않았습니다." : "A direct network call exists, but the service identity was not confirmed.",
      evidence: evidenceFrom(network[0], personEvidence[0].file),
      confidence: "review-required",
    });
    for (const container of containers.filter((candidate) => network.some(({ targetNames }) => targetNames?.includes(candidate.name)))) {
      const interaction = network.find(({ targetNames }) => targetNames?.includes(container.name)) ?? network[0];
      relationships.push({
        id: `${container.id}-calls-${externalId}`,
        from: container.id,
        to: externalId,
        description: isKorean ? "외부 서비스를 호출합니다." : "Calls an external service.",
        technology: interaction.technology || "URLSession",
        evidence: evidenceFrom(interaction, personEvidence[0].file),
        confidence: "review-required",
      });
    }
  }

  return {
    project: {
      name: projectName,
      description: isKorean ? "정적 소스 증거에서 생성한 보수적 C4 모델입니다." : "A conservative C4 model generated from static source evidence.",
      language,
    },
    elements,
    relationships,
  };
}

function markdownEvidence(item) {
  if (!item?.file) return "";
  const location = `${item.file}${item.line ? `:${item.line}` : ""}`;
  return `${location}${item.symbol ? ` · ${item.symbol}` : ""}${item.reason ? ` — ${item.reason}` : ""}`;
}

function analysisMarkdown({ scan, model, warnings, repairs, issues, language }) {
  const isKorean = language === "ko";
  const elementById = new Map((model?.elements ?? []).map((element) => [element.id, element]));
  const elementLines = (model?.elements ?? []).flatMap((element) => {
    const parent = element.parentId ? elementById.get(element.parentId)?.name : undefined;
    const lines = [
      `### ${element.name}`,
      "",
      `- ${isKorean ? "C4 유형" : "C4 type"}: ${element.type}${parent ? ` · ${isKorean ? "상위 경계" : "parent"}: ${parent}` : ""}`,
      ...(element.technology ? [`- ${isKorean ? "기술" : "Technology"}: ${element.technology}`] : []),
      `- ${isKorean ? "설명" : "Description"}: ${element.description}`,
      ...(element.responsibilities ?? []).map((value) => `- ${isKorean ? "책임" : "Responsibility"}: ${value}`),
      ...(element.inputs ?? []).map((value) => `- ${isKorean ? "입력" : "Input"}: ${typeof value === "string" ? value : value.name}`),
      ...(element.outputs ?? []).map((value) => `- ${isKorean ? "출력" : "Output"}: ${typeof value === "string" ? value : value.name}`),
      ...(element.evidenceSummary ? [`- ${isKorean ? "근거 요약" : "Evidence summary"}: ${element.evidenceSummary}`] : []),
      ...(element.evidence ?? []).map((item) => `- ${isKorean ? "코드 근거" : "Code evidence"}: ${markdownEvidence(item)}`),
      "",
    ];
    return lines;
  });
  const relationshipLines = (model?.relationships ?? []).flatMap((relationship) => {
    const from = elementById.get(relationship.from)?.name ?? relationship.from;
    const to = elementById.get(relationship.to)?.name ?? relationship.to;
    return [
      `### ${from} → ${to}`,
      "",
      ...(relationship.technology ? [`- ${isKorean ? "API / 프로토콜" : "API / protocol"}: ${relationship.technology}`] : []),
      `- ${isKorean ? "동작" : "Action"}: ${relationship.description}`,
      ...(relationship.purpose ? [`- ${isKorean ? "목적" : "Purpose"}: ${relationship.purpose}`] : []),
      ...(relationship.payload ? [`- ${isKorean ? "데이터" : "Payload"}: ${relationship.payload}`] : []),
      ...(relationship.senderEvidence ?? []).map((item) => `- ${isKorean ? "송신 근거" : "Sender evidence"}: ${markdownEvidence(item)}`),
      ...(relationship.receiverEvidence ?? []).map((item) => `- ${isKorean ? "수신 근거" : "Receiver evidence"}: ${markdownEvidence(item)}`),
      "",
    ];
  });
  const lines = [
    `# ${scan.project?.name || "Apple Project"} C4 Analysis`,
    "",
    isKorean ? "## 분석 범위" : "## Analysis scope",
    "",
    `- ${isKorean ? "대상" : "Targets"}: ${scan.targets.length}`,
    `- ${isKorean ? "파일" : "Files"}: ${scan.files.length}`,
    `- ${isKorean ? "네트워크 없이 정적 증거만 사용" : "Static evidence only; no network or build"}`,
    "",
    isKorean ? "## 요소와 책임" : "## Elements and responsibilities",
    "",
    ...elementLines,
    isKorean ? "## 관계와 데이터 흐름" : "## Relationships and data flow",
    "",
    ...relationshipLines,
    isKorean ? "## 경고와 불확실성" : "## Warnings and uncertainty",
    "",
    ...(warnings.length ? warnings.map((item) => `- [${item.code}] ${item.message || item.file || "Review required"}`) : [isKorean ? "- 없음" : "- None"]),
    "",
    isKorean ? "## 자동 정규화" : "## Automatic normalization",
    "",
    ...(repairs.length ? repairs.map((item) => `- [${item.code}] ${item.elementId || item.relationshipId || "model"}`) : [isKorean ? "- 없음" : "- None"]),
    "",
    isKorean ? "## 모델 검토 항목" : "## Model review items",
    "",
    ...(issues.length ? issues.map((item) => `- [${item.code}] ${item.message}`) : [isKorean ? "- 없음" : "- None"]),
    "",
  ];
  return lines.join("\n");
}

async function emitProgress(onProgress, phase, index, message) {
  await onProgress({ phase, index, total: 6, message });
}

export async function buildExplorer({
  model,
  analysisMarkdown,
  outputDirectory,
  shellPath = DEFAULT_SHELL_PATH,
}) {
  const shell = await fs.readFile(shellPath, "utf8");
  const placeholder = "__C4_MODEL_JSON__";
  const placeholderCount = shell.split(placeholder).length - 1;
  if (placeholderCount !== 1) throw new Error(`Explorer shell must contain exactly one model placeholder; found ${placeholderCount}.`);

  const output = path.resolve(outputDirectory);
  await fs.mkdir(output, { recursive: true });
  const projectName = fileSlug(model.project?.name);
  const htmlPath = path.join(output, `${projectName}-c4-explorer.html`);
  const modelPath = path.join(output, "c4-model.json");
  const analysisPath = path.join(output, "c4-analysis.md");
  const workspaceDslPath = path.join(output, "workspace.dsl");
  const html = shell.replace(placeholder, escapeJsonForHtml(model));
  const workspaceDsl = exportStructurizrDsl(model);

  await Promise.all([
    writeAtomic(htmlPath, html),
    writeAtomic(modelPath, `${JSON.stringify(model, null, 2)}\n`),
    writeAtomic(analysisPath, String(analysisMarkdown ?? "")),
    writeAtomic(workspaceDslPath, workspaceDsl),
  ]);
  return { html: htmlPath, model: modelPath, analysis: analysisPath, workspaceDsl: workspaceDslPath };
}

export async function runPipeline({
  projectRoot,
  outputDirectory,
  language = "ko",
  synthesizeModel,
  onProgress = () => {},
}) {
  const warnings = [];

  await emitProgress(onProgress, "scan", 1, "Scanning the Xcode project and targets");
  const scan = await scanXcodeProject(projectRoot);
  warnings.push(...scan.warnings);

  await emitProgress(onProgress, "synthesize", 2, "Classifying evidence and synthesizing the C4 model");
  let rawModel;
  try {
    const synthesizer = typeof synthesizeModel === "function" ? synthesizeModel : synthesizeC4Model;
    rawModel = await synthesizer(scan, { language });
    if (!rawModel || typeof rawModel !== "object") throw new Error("Semantic synthesizer returned no model.");
    rawModel.project = { ...rawModel.project, language };
  } catch (error) {
    warnings.push({
      code: "semantic-synthesis-fallback",
      message: `Semantic synthesis failed; generated a conservative review-required model: ${error.message}`,
    });
    rawModel = conservativeFallbackModel(scan, language);
  }

  await emitProgress(onProgress, "normalize", 3, "Building and normalizing the canonical L1/L2/L3 model");
  const normalized = normalizeC4Model(rawModel, scan);

  await emitProgress(onProgress, "layout", 4, "Laying out nodes, boundaries, and relationship lanes");
  const model = layoutC4Model(normalized.model);
  const analysis = analysisMarkdown({
    scan,
    model,
    warnings,
    repairs: normalized.repairs,
    issues: normalized.issues,
    language,
  });

  await emitProgress(onProgress, "build", 5, "Building the standalone offline explorer");
  const paths = await buildExplorer({ model, analysisMarkdown: analysis, outputDirectory });

  await emitProgress(onProgress, "validate", 6, "Validating the model, geometry, runtime, and accessibility");
  const [html, workspaceDsl] = await Promise.all([
    fs.readFile(paths.html, "utf8"),
    fs.readFile(paths.workspaceDsl, "utf8"),
  ]);
  const validation = await validateC4Output({ model, html, workspaceDsl, repairs: normalized.repairs });
  validation.warnings = [...warnings, ...normalized.issues, ...validation.warnings];
  paths.validation = await writeValidationReport(path.join(path.resolve(outputDirectory), "validation-report.json"), validation);

  return {
    scan,
    model,
    validation,
    warnings: validation.warnings,
    repairs: normalized.repairs,
    paths,
  };
}

export async function runBuildCli(args = process.argv.slice(2), io = console) {
  const [modelInputPath, analysisInputPath, outputDirectory] = args;
  if (!modelInputPath || !analysisInputPath || !outputDirectory) {
    io.error("Usage: build-c4-explorer.mjs <laid-out-model-json> <analysis-markdown> <output-directory>");
    return 2;
  }
  try {
    const model = JSON.parse(await fs.readFile(modelInputPath, "utf8"));
    const analysisMarkdown = await fs.readFile(analysisInputPath, "utf8");
    const paths = await buildExplorer({ model, analysisMarkdown, outputDirectory });
    const [html, workspaceDsl] = await Promise.all([
      fs.readFile(paths.html, "utf8"),
      fs.readFile(paths.workspaceDsl, "utf8"),
    ]);
    const report = await validateC4Output({ model, html, workspaceDsl });
    const validation = await writeValidationReport(path.join(path.resolve(outputDirectory), "validation-report.json"), report);
    io.log(JSON.stringify({ ...paths, validation }));
    return report.errors.length ? 1 : 0;
  } catch (error) {
    io.error(error.message);
    return ["ENOENT", "EACCES"].includes(error.code) || error instanceof SyntaxError ? 2 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runBuildCli();
}
