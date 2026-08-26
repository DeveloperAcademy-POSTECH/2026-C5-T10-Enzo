import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".build",
  "build",
  "DerivedData",
  "Pods",
  "xcuserdata",
]);

const INCLUDED_FILE_NAMES = new Set(["Package.swift"]);
const INCLUDED_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".entitlements",
  ".h",
  ".hpp",
  ".m",
  ".md",
  ".mm",
  ".mlmodel",
  ".onnx",
  ".pbxproj",
  ".plist",
  ".swift",
]);

const SOURCE_EXTENSIONS = new Set([".swift", ".m", ".mm", ".c", ".cc", ".cpp", ".h", ".hpp"]);
const NATIVE_EXTENSIONS = new Set([".m", ".mm", ".c", ".cc", ".cpp", ".h", ".hpp"]);
const MODEL_EXTENSIONS = new Set([".mlmodel", ".onnx"]);

function posix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function lineNumberAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function discoveredKind(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".swift") return "swift";
  if (NATIVE_EXTENSIONS.has(extension)) return "native-source";
  if (MODEL_EXTENSIONS.has(extension)) return "model-artifact";
  if (extension === ".pbxproj") return "xcode-project";
  if (extension === ".md") return "documentation";
  return "configuration";
}

function cleanPbxValue(value = "") {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .replace(/^"|"$/g, "");
}

function field(body, name) {
  return cleanPbxValue(body.match(new RegExp(`\\b${name}\\s*=\\s*([^;]+);`))?.[1]);
}

function idList(body, name) {
  const raw = body.match(new RegExp(`\\b${name}\\s*=\\s*\\(([^)]*)\\)`, "s"))?.[1] ?? "";
  return [...raw.matchAll(/\b[A-Za-z0-9]{24}\b/g)].map(([id]) => id);
}

function objectBlocks(source) {
  const objects = new Map();
  const startPattern = /\b([A-Za-z0-9]{24})(?:\s*\/\*[\s\S]*?\*\/)?\s*=\s*\{/g;
  let match;

  while ((match = startPattern.exec(source))) {
    let depth = 1;
    let quote = null;
    let escaped = false;
    let index = startPattern.lastIndex;

    for (; index < source.length && depth > 0; index += 1) {
      const character = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\" && quote) {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
      }
    }

    if (depth !== 0) throw new Error(`Unbalanced object ${match[1]}`);
    objects.set(match[1], source.slice(startPattern.lastIndex, index - 1));
    startPattern.lastIndex = index;
  }

  return objects;
}

function runtimeKindFor(productType, sdkRoot = "") {
  if (/watch/i.test(productType) || /watch/i.test(sdkRoot)) return "watch-app";
  if (/extension/i.test(productType)) return "extension";
  if (!/application/i.test(productType)) return "unknown-runtime";
  if (/macosx/i.test(sdkRoot)) return "macos-app";
  if (/appletv/i.test(sdkRoot)) return "tvos-app";
  if (/xros|vision/i.test(sdkRoot)) return "visionos-app";
  return "ios-app";
}

export async function discoverProjectFiles(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const discovered = [];

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = posix(path.relative(resolvedRoot, absolute));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        if (relative.endsWith("Carthage/Build")) continue;
        if (entry.name.endsWith(".xcdatamodeld") || entry.name.endsWith(".xcassets") || entry.name.endsWith(".mlpackage")) {
          discovered.push({
            path: relative,
            absolutePath: absolute,
            kind: entry.name.endsWith(".mlpackage") ? "model-artifact" : "resource-directory",
          });
          continue;
        }
        await walk(absolute);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!INCLUDED_FILE_NAMES.has(entry.name) && !INCLUDED_EXTENSIONS.has(extension)) continue;
      discovered.push({
        path: relative,
        absolutePath: absolute,
        kind: discoveredKind(entry.name),
      });
    }
  }

  await walk(resolvedRoot);
  return discovered;
}

export function parsePbxTargets(pbxText) {
  const objects = objectBlocks(pbxText);
  const fileReferences = new Map();
  const buildFiles = new Map();
  const sourcePhases = new Map();
  const configurations = new Map();
  const configurationLists = new Map();
  const synchronizedRootGroups = new Map();

  for (const [id, body] of objects) {
    const isa = field(body, "isa");
    if (isa === "PBXFileReference") fileReferences.set(id, field(body, "path") || field(body, "name"));
    if (isa === "PBXBuildFile") buildFiles.set(id, field(body, "fileRef"));
    if (isa === "PBXSourcesBuildPhase") sourcePhases.set(id, idList(body, "files"));
    if (isa === "XCBuildConfiguration") configurations.set(id, field(body, "SDKROOT"));
    if (isa === "XCConfigurationList") configurationLists.set(id, idList(body, "buildConfigurations"));
    if (isa === "PBXFileSystemSynchronizedRootGroup") synchronizedRootGroups.set(id, field(body, "path") || field(body, "name"));
  }

  const targets = [];
  for (const [id, body] of objects) {
    if (field(body, "isa") !== "PBXNativeTarget") continue;
    const buildPhaseIds = idList(body, "buildPhases");
    const sourceFiles = buildPhaseIds
      .flatMap((phaseId) => sourcePhases.get(phaseId) ?? [])
      .map((buildFileId) => buildFiles.get(buildFileId))
      .map((fileReferenceId) => fileReferences.get(fileReferenceId))
      .filter(Boolean);
    const configurationIds = configurationLists.get(field(body, "buildConfigurationList")) ?? [];
    const sdkRoot = configurationIds.map((configurationId) => configurations.get(configurationId)).find(Boolean) ?? "";
    const productType = field(body, "productType");
    const synchronizedRoots = idList(body, "fileSystemSynchronizedGroups")
      .map((groupId) => synchronizedRootGroups.get(groupId))
      .filter(Boolean);
    const name = field(body, "name") || field(body, "productName") || id;
    targets.push({
      id,
      name,
      productType,
      sdkRoot,
      runtimeKind: runtimeKindFor(productType, sdkRoot),
      sourceFiles,
      synchronizedRoots,
      isTest: /unit-test|ui-testing|xctest/i.test(`${productType} ${name}`),
    });
  }

  return targets;
}

export function extractSwiftEvidence(source, relativePath) {
  if (source.includes("\u0000")) throw new Error("Swift source contains a NUL byte");

  const declarations = [];
  const interactions = [];
  const imports = [];
  const interfaces = [];
  const dependencies = [];
  const lines = source.split("\n");
  let enclosingDeclaration;

  const payloadKeysIn = (window) => {
    const keys = [
      ...[...window.matchAll(/[\[,{]\s*["']([A-Za-z_][A-Za-z0-9_.-]*)["']\s*[:\]]/g)].map((match) => match[1]),
      ...[...window.matchAll(/\bConnectivityMessageKeys\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]),
    ];
    return [...new Set(keys)].sort();
  };
  const callWindow = (lineIndex) => {
    const selected = [];
    let depth = 0;
    let started = false;
    for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 12); index += 1) {
      selected.push(lines[index]);
      for (const character of lines[index]) {
        if (character === "(") {
          depth += 1;
          started = true;
        } else if (character === ")") {
          depth -= 1;
        }
      }
      if (started && depth <= 0) break;
    }
    return selected.join("\n");
  };
  const handlerWindow = (lineIndex) => {
    let end = Math.min(lines.length, lineIndex + 24);
    for (let index = lineIndex + 1; index < end; index += 1) {
      if (/^\s*(?:(?:public|private|internal|fileprivate|open|static|class|mutating|nonmutating)\s+)*func\s+/.test(lines[index])) {
        end = index;
        break;
      }
    }
    return lines.slice(lineIndex, end).join("\n");
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const evidence = (symbol, reason) => ({ file: relativePath, line: lineNumber, symbol, reason });
    const imported = line.match(/^\s*import\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (imported) imports.push({ name: imported[1], evidence: evidence(imported[1], "Swift import") });

    const declaration = line.match(/\b(protocol|class|struct|actor|enum)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([^\{]+))?/);
    if (declaration) {
      enclosingDeclaration = declaration[2];
      const declarationRecord = {
        kind: declaration[1],
        name: declaration[2],
        conformances: (declaration[3] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        attributes: index > 0 && /@\w+/.test(lines[index - 1]) ? [lines[index - 1].trim().split(/[ (]/)[0]] : [],
        evidence: evidence(declaration[2], `${declaration[1]} declaration`),
      };
      declarations.push(declarationRecord);
      if (declaration[1] === "protocol") interfaces.push({
        language: "swift",
        name: declaration[2],
        evidence: evidence(declaration[2], "Swift protocol boundary"),
      });
    }

    const message = line.match(/\b(?:WCSession(?:\.default)?|session)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (message && ["sendMessage", "transferUserInfo", "updateApplicationContext"].includes(message[1])) {
      interactions.push({
        kind: "message-send",
        technology: `WCSession.${message[1]}`,
        payloadKeys: payloadKeysIn(callWindow(index)),
        enclosingDeclaration,
        evidence: evidence(message[1], "Direct WatchConnectivity send call"),
      });
    }

    const receiveMethod = line.match(/\bdidReceive(UserInfo|Message)\b/);
    if (receiveMethod) {
      const method = receiveMethod[1] === "UserInfo" ? "didReceiveUserInfo" : "didReceiveMessage";
      interactions.push({
        kind: "message-receive",
        technology: `WCSession.${method}`,
        payloadKeys: payloadKeysIn(handlerWindow(index)),
        enclosingDeclaration,
        evidence: evidence(method, "WatchConnectivity delegate receive handler"),
      });
    }

    if (/\breplyHandler\s*\(/.test(line)) {
      interactions.push({
        kind: "message-reply",
        technology: "WCSession.replyHandler",
        payloadKeys: payloadKeysIn(callWindow(index)),
        enclosingDeclaration,
        evidence: evidence("replyHandler", "WatchConnectivity reply callback"),
      });
    }

    if (/\bstartAccessingSecurityScopedResource\s*\(|\bAVAudioFile\s*\(\s*forReading\s*:/.test(line)) {
      interactions.push({
        kind: "file-read",
        technology: "Security-scoped URL · AVFoundation",
        enclosingDeclaration,
        evidence: evidence(
          /startAccessingSecurityScopedResource/.test(line) ? "startAccessingSecurityScopedResource" : "AVAudioFile(forReading:)",
          "Reads a user-selected audio file through a security-scoped URL",
        ),
      });
    }

    if (/\b(?:context\.)?(?:insert|save)\s*\(|\.write\s*\(to:/.test(line)) {
      interactions.push({
        kind: "persistence-write",
        technology: /\.write\s*\(to:/.test(line) ? "Foundation File I/O" : "SwiftData ModelContext",
        enclosingDeclaration,
        evidence: evidence(undefined, "Direct persistence write call"),
      });
    }

    if (/\b(?:fetch|Data\s*\(contentsOf:)\s*\(/.test(line)) {
      interactions.push({
        kind: "persistence-read",
        technology: /Data\s*\(contentsOf:/.test(line) ? "Foundation File I/O" : "SwiftData ModelContext",
        enclosingDeclaration,
        evidence: evidence(undefined, "Direct persistence read call"),
      });
    }

    const network = line.match(/URLSession(?:\.shared)?\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (network) {
      interactions.push({
        kind: "network-request",
        technology: `URLSession.${network[1]}`,
        enclosingDeclaration,
        evidence: evidence(network[1], "Direct URLSession call"),
      });
    }

    const motion = line.match(/\b(startDeviceMotionUpdates|startAccelerometerUpdates|startGyroUpdates)\s*\(/);
    if (motion) {
      interactions.push({
        kind: "sensor-read",
        technology: `CoreMotion.${motion[1]}`,
        enclosingDeclaration,
        evidence: evidence(motion[1], "Direct Core Motion call"),
      });
    }

    const propertyDependency = line.match(/\b(?:let|var)\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*([A-Z][A-Za-z0-9_]*)/);
    if (propertyDependency && propertyDependency[1] !== enclosingDeclaration) {
      dependencies.push({
        kind: "type-reference",
        fromSymbol: enclosingDeclaration,
        toSymbol: propertyDependency[1],
        evidence: evidence(propertyDependency[1], "Typed property dependency"),
      });
    }

    for (const initializer of line.matchAll(/\b([A-Z][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*\(/g)) {
      if (initializer[1] === enclosingDeclaration) continue;
      dependencies.push({
        kind: "initializer-call",
        fromSymbol: enclosingDeclaration,
        toSymbol: initializer[1],
        evidence: evidence(initializer[1], "Direct initializer call"),
      });
    }

    const memberCall = line.match(/\b([a-z_][A-Za-z0-9_]*)\??\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (memberCall && !["session", "context"].includes(memberCall[1])) {
      dependencies.push({
        kind: "method-call",
        fromSymbol: enclosingDeclaration,
        receiver: memberCall[1],
        member: memberCall[2],
        evidence: evidence(memberCall[2], "Direct member call"),
      });
    }
  }

  return { imports, declarations, interfaces, dependencies, interactions };
}

export function extractNativeEvidence(source, relativePath) {
  if (source.includes("\u0000")) throw new Error("Native source contains a NUL byte");
  const imports = [];
  const declarations = [];
  const interfaces = [];
  const dependencies = [];
  const interactions = [];
  const lines = source.split("\n");
  let enclosingDeclaration;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const evidence = (symbol, reason) => ({ file: relativePath, line: lineNumber, ...(symbol ? { symbol } : {}), reason });
    const imported = line.match(/^\s*#(?:import|include)\s+[<"]([^>"]+)[>"]/);
    if (imported) imports.push({ name: imported[1], evidence: evidence(imported[1], "Native include") });

    const objectiveInterface = line.match(/@interface\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (objectiveInterface) {
      enclosingDeclaration = objectiveInterface[1];
      const record = { language: "objective-c", name: objectiveInterface[1], evidence: evidence(objectiveInterface[1], "Objective-C interface boundary") };
      interfaces.push(record);
      declarations.push({ kind: "interface", name: objectiveInterface[1], conformances: [], attributes: [], evidence: record.evidence });
    }
    const implementation = line.match(/@implementation\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (implementation) enclosingDeclaration = implementation[1];
    const cppClass = line.match(/\b(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (cppClass) {
      enclosingDeclaration = cppClass[1];
      declarations.push({ kind: "class", name: cppClass[1], conformances: [], attributes: [], evidence: evidence(cppClass[1], "C++ type declaration") });
    }

    const nativeCall = line.match(/(?:->|\.)([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (nativeCall) dependencies.push({
      kind: "native-bridge-call",
      fromSymbol: enclosingDeclaration,
      member: nativeCall[1],
      evidence: evidence(nativeCall[1], "Native bridge or C++ method call"),
    });
  }

  return { imports, declarations, interfaces, dependencies, interactions };
}

function resolveMembership(rawPath, swiftFiles) {
  const normalized = posix(rawPath);
  if (swiftFiles.some((candidate) => candidate.path === normalized)) return normalized;
  const matches = swiftFiles.filter((candidate) => path.posix.basename(candidate.path) === path.posix.basename(normalized));
  return matches.length === 1 ? matches[0].path : normalized;
}

function projectDepth(projectPath) {
  return Math.max(0, posix(projectPath).split("/").length - 2);
}

function isApplicationTarget(target) {
  return !target.isTest && (target.runtimeKind?.endsWith("app") || target.runtimeKind === "extension");
}

function selectPrimaryProject(projects, rootName) {
  return [...projects].sort((first, second) => {
    const firstRootMatch = first.name.toLowerCase() === rootName.toLowerCase() ? 1 : 0;
    const secondRootMatch = second.name.toLowerCase() === rootName.toLowerCase() ? 1 : 0;
    if (firstRootMatch !== secondRootMatch) return secondRootMatch - firstRootMatch;
    if (first.depth !== second.depth) return first.depth - second.depth;
    if (first.applicationTargetCount !== second.applicationTargetCount) return second.applicationTargetCount - first.applicationTargetCount;
    return first.path.localeCompare(second.path);
  })[0];
}

export async function scanXcodeProject(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  await fs.access(root);
  const files = await discoverProjectFiles(root);
  const swiftFiles = files.filter(({ kind }) => kind === "swift");
  const nativeFiles = files.filter(({ kind }) => kind === "native-source");
  const sourceFiles = files.filter(({ path: filePath }) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  const projectFiles = files.filter(({ kind }) => kind === "xcode-project");
  if (projectFiles.length === 0 && !files.some(({ path: file }) => file === "Package.swift")) {
    const error = new Error(`No analyzable Apple/Xcode project found at ${root}`);
    error.code = "NO_APPLE_PROJECT";
    throw error;
  }

  const warnings = [];
  const defaultReadText = (file) => fs.readFile(file, "utf8");
  const readText = options.readText ?? ((file, fallback) => fallback(file));
  const parsedProjects = [];

  for (const projectFile of projectFiles) {
    try {
      const parsed = parsePbxTargets(await readText(projectFile.absolutePath, defaultReadText));
      const projectName = path.basename(path.dirname(projectFile.absolutePath), ".xcodeproj");
      const projectTargets = parsed.map((target) => ({
        ...target,
        projectPath: projectFile.path,
        sourceFiles: [...new Set([
          ...target.sourceFiles.map((sourceFile) => resolveMembership(sourceFile, sourceFiles)),
          ...target.synchronizedRoots.flatMap((rootPath) => sourceFiles
            .filter(({ path: filePath }) => filePath === rootPath || filePath.startsWith(`${posix(rootPath)}/`))
            .map(({ path: filePath }) => filePath)),
        ])].sort(),
        evidence: { file: projectFile.path, reason: "PBXNativeTarget and build phase membership" },
      }));
      parsedProjects.push({
        path: projectFile.path,
        name: projectName,
        depth: projectDepth(projectFile.path),
        applicationTargetCount: projectTargets.filter(isApplicationTarget).length,
        targets: projectTargets,
      });
    } catch (error) {
      warnings.push({ code: "pbxproj-parse-partial", file: projectFile.path, message: error.message });
    }
  }

  const primaryProject = selectPrimaryProject(parsedProjects, path.basename(root));
  const projects = parsedProjects.map(({ targets: projectTargets, ...project }) => ({
    ...project,
    targetIds: projectTargets.map(({ id }) => id),
    primary: project.path === primaryProject?.path,
  }));
  const targets = primaryProject?.targets ?? [];

  const declarations = [];
  const interactions = [];
  const imports = [];
  const interfaces = [];
  const dependencies = [];
  for (const sourceFile of [...swiftFiles, ...nativeFiles]) {
    try {
      const source = await readText(sourceFile.absolutePath, defaultReadText);
      const evidence = sourceFile.kind === "swift"
        ? extractSwiftEvidence(source, sourceFile.path)
        : extractNativeEvidence(source, sourceFile.path);
      const targetNames = targets.filter(({ sourceFiles: memberships }) => memberships.includes(sourceFile.path)).map(({ name }) => name);
      declarations.push(...evidence.declarations.map((item) => ({ ...item, targetNames })));
      interactions.push(...evidence.interactions.map((item) => ({ ...item, targetNames })));
      imports.push(...evidence.imports.map((item) => ({ ...item, targetNames })));
      interfaces.push(...evidence.interfaces.map((item) => ({ ...item, targetNames })));
      dependencies.push(...evidence.dependencies.map((item) => ({ ...item, targetNames })));
    } catch (error) {
      warnings.push({
        code: sourceFile.kind === "swift" ? "swift-parse-partial" : "native-parse-partial",
        file: sourceFile.path,
        message: error.message,
      });
    }
  }

  const artifacts = [];
  for (const artifactFile of files.filter(({ kind }) => kind === "model-artifact")) {
    const stats = await fs.stat(artifactFile.absolutePath);
    const targetNames = targets.filter(({ synchronizedRoots, sourceFiles: memberships }) =>
      memberships.includes(artifactFile.path) || synchronizedRoots.some((rootPath) => artifactFile.path.startsWith(`${posix(rootPath)}/`)))
      .map(({ name }) => name);
    artifacts.push({
      path: artifactFile.path,
      kind: path.extname(artifactFile.path).toLowerCase().replace(/^\./, "") || "model-package",
      size: stats.size,
      targetNames,
      evidence: { file: artifactFile.path, reason: "Bundled model artifact" },
    });
  }

  const projectName = primaryProject
    ? primaryProject.name
    : path.basename(root);

  return {
    version: "1.0.0",
    project: { name: projectName, root },
    projects,
    targets,
    files: files.map(({ path: filePath, kind }) => ({ path: filePath, kind })),
    imports,
    declarations,
    interfaces,
    dependencies,
    interactions,
    artifacts,
    warnings,
  };
}

async function writeJsonAtomic(outputPath, value) {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, absolute);
}

export async function runScanCli(args = process.argv.slice(2), io = console) {
  const [projectRoot, outputPath] = args;
  if (!projectRoot || !outputPath) {
    io.error("Usage: scan-xcode-project.mjs <project-root> <output-json>");
    return 2;
  }
  try {
    await writeJsonAtomic(outputPath, await scanXcodeProject(projectRoot));
    return 0;
  } catch (error) {
    io.error(error.message);
    return error.code === "ENOENT" || error.code === "EACCES" || error.code === "NO_APPLE_PROJECT" ? 2 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runScanCli();
}
