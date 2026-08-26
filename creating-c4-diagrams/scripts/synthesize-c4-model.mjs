const ROLE_PATTERN = /(App|View|Screen|Presentation|Coordinator|Flow|Manager|Connectivity|Bridge|Service|Repository|Store|Engine|Adapter|Gateway|Motion|Sampler|Persistence)/i;
const DATA_TYPE_PATTERN = /(Model|Entity|DTO|Payload|Message|Keys|Error|State|Phase|Result|Record)$/i;
const TECH_IMPORTS = new Set([
  "SwiftUI",
  "WatchConnectivity",
  "SwiftData",
  "CoreData",
  "CoreMotion",
  "HealthKit",
  "AVFoundation",
  "Combine",
  "CoreML",
]);

function normalized(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function slug(value) {
  return normalized(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "element";
}

function uniqueId(candidate, used) {
  const base = slug(candidate);
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function evidenceKey(item) {
  return [item?.file, item?.line ?? "", item?.symbol ?? "", item?.reason ?? ""].join("|");
}

function uniqueEvidence(items) {
  return [...new Map((items ?? []).filter((item) => item?.file).map((item) => [evidenceKey(item), { ...item }])).values()];
}

function representativeEvidence(items, limit = 18) {
  const unique = uniqueEvidence(items);
  const selected = [];
  const seenFiles = new Set();
  for (const item of unique) {
    if (seenFiles.has(item.file)) continue;
    selected.push(item);
    seenFiles.add(item.file);
    if (selected.length >= limit) return selected;
  }
  for (const item of unique) {
    if (selected.some((candidate) => evidenceKey(candidate) === evidenceKey(item))) continue;
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

function platformForTarget(target) {
  return {
    "ios-app": "iOS",
    "watch-app": "watchOS",
    "macos-app": "macOS",
    "tvos-app": "tvOS",
    "visionos-app": "visionOS",
    extension: "Apple extension",
  }[target.runtimeKind] ?? "Apple runtime";
}

function technologyForTarget(target) {
  return `Swift · ${platformForTarget(target)}`;
}

function targetDescription(target, korean) {
  const platform = platformForTarget(target);
  return korean
    ? `Xcode 대상 메타데이터에서 확인된 ${platform} 실행 경계입니다.`
    : `A ${platform} runtime boundary confirmed by Xcode target metadata.`;
}

function humanizeSourceKey(value) {
  const text = normalized(value).replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function payloadNames(keys) {
  return [...new Set((keys ?? []).map(humanizeSourceKey).filter(Boolean))];
}

function ioEntry(name, evidence) {
  return { name, evidence: uniqueEvidence(evidence) };
}

function inputsAndOutputsFor(candidate, korean) {
  const inputs = [];
  const outputs = [];
  const add = (list, label, evidence) => {
    if (!label || list.some(({ name }) => name === label)) return;
    list.push(ioEntry(label, evidence));
  };

  for (const interaction of candidate.interactions) {
    const evidence = [interaction.evidence];
    const payload = payloadNames(interaction.payloadKeys).join(" + ");
    if (interaction.kind === "message-receive") add(inputs, payload || (korean ? "수신 메시지" : "Received message"), evidence);
    if (interaction.kind === "message-send") add(outputs, payload || (korean ? "송신 메시지" : "Outgoing message"), evidence);
    if (interaction.kind === "message-reply") add(outputs, payload || (korean ? "응답 메시지" : "Reply message"), evidence);
    if (interaction.kind === "persistence-read") add(inputs, korean ? "저장된 애플리케이션 데이터" : "Stored application data", evidence);
    if (interaction.kind === "persistence-write") {
      add(inputs, korean ? "저장할 애플리케이션 데이터" : "Application data to persist", evidence);
      add(outputs, korean ? "영속화된 데이터" : "Persisted data", evidence);
    }
    if (interaction.kind === "sensor-read") {
      add(inputs, korean ? "기기 센서 표본" : "Device sensor samples", evidence);
      add(outputs, korean ? "정규화된 센서 스트림" : "Normalized sensor stream", evidence);
    }
    if (interaction.kind === "network-request") {
      add(inputs, korean ? "외부 서비스 응답" : "External service response", evidence);
      add(outputs, korean ? "네트워크 요청" : "Network request", evidence);
    }
    if (interaction.kind === "file-read") {
      add(inputs, korean ? "사용자가 선택한 파일 URL" : "User-selected file URL", evidence);
      add(outputs, korean ? "읽은 파일 데이터" : "Read file data", evidence);
    }
  }

  if (candidate.category === "presentation") {
    add(inputs, korean ? "사용자 입력" : "User input", candidate.evidence);
    add(outputs, korean ? "화면 상태와 동작 요청" : "Screen state and action requests", candidate.evidence);
  }
  for (const dependency of candidate.dependencies) {
    if (dependency.fromSymbol) add(inputs, korean ? `${dependency.fromSymbol} 호출` : `Calls from ${dependency.fromSymbol}`, [dependency.evidence]);
    if (dependency.toSymbol) add(outputs, korean ? `${dependency.toSymbol} 위임` : `Delegated ${dependency.toSymbol} behavior`, [dependency.evidence]);
  }

  const sourceNames = candidate.declarations.map(({ name }) => name).slice(0, 3).join(", ");
  if (inputs.length === 0) add(inputs, korean ? `${sourceNames} 진입 호출` : `Calls into ${sourceNames}`, candidate.evidence);
  if (outputs.length === 0) add(outputs, korean ? `${sourceNames} 처리 결과` : `Results from ${sourceNames}`, candidate.evidence);
  return { inputs, outputs };
}

function componentTechnology(candidate, scan) {
  const imports = scan.imports
    .filter(({ targetNames = [], evidence, name }) => targetNames.includes(candidate.target.name) && candidate.files.has(evidence?.file) && TECH_IMPORTS.has(name))
    .map(({ name }) => name);
  const language = [...candidate.files].some((file) => /\.(?:m|mm|h|hpp|c|cc|cpp)$/.test(file)) ? "Objective-C++" : "Swift";
  return [...new Set([language, ...imports])].join(" · ");
}

function categoryFor(declaration, scan, target) {
  if (["protocol", "enum"].includes(declaration.kind) || DATA_TYPE_PATTERN.test(declaration.name)) return null;
  const file = declaration.evidence?.file ?? "";
  const interactions = scan.interactions.filter(({ targetNames = [], enclosingDeclaration, evidence }) =>
    targetNames.includes(target.name) && (enclosingDeclaration ? enclosingDeclaration === declaration.name : evidence?.file === file));
  if (/\.(?:m|mm|h|hpp|c|cc|cpp)$/.test(file)) return "native-integration";
  if (interactions.some(({ kind }) => /^message-/.test(kind))) return "messaging";
  if (interactions.some(({ kind }) => /^persistence-/.test(kind))) return "persistence";
  if (interactions.some(({ kind }) => kind === "sensor-read")) return "sensor-input";
  if (interactions.some(({ kind }) => kind === "file-read")) return "file-access";
  if (interactions.some(({ kind }) => kind === "network-request")) return "network-client";
  if (declaration.attributes?.includes("@main") || declaration.conformances?.includes("App") || declaration.conformances?.includes("View") || /View|Screen|Presentation/i.test(declaration.name)) return "presentation";
  if (/Repository|Store|Persistence/i.test(declaration.name)) return "persistence";
  if (/Connectivity|Bridge|Adapter|Gateway/i.test(declaration.name)) return "integration";
  if (ROLE_PATTERN.test(declaration.name)) return "application-service";
  return null;
}

function categoryName(category, korean) {
  const names = korean ? {
    presentation: "프레젠테이션 경계",
    messaging: "메시징 게이트웨이",
    persistence: "영속성 경계",
    "sensor-input": "센서 입력 경계",
    "file-access": "파일 접근 경계",
    "network-client": "네트워크 클라이언트",
    "native-integration": "네이티브 통합 경계",
    integration: "통합 경계",
    "application-service": "애플리케이션 서비스 경계",
  } : {
    presentation: "Presentation Boundary",
    messaging: "Messaging Gateway",
    persistence: "Persistence Boundary",
    "sensor-input": "Sensor Input Boundary",
    "file-access": "File Access Boundary",
    "network-client": "Network Client",
    "native-integration": "Native Integration Boundary",
    integration: "Integration Boundary",
    "application-service": "Application Service Boundary",
  };
  return names[category] ?? category;
}

function componentCandidates(scan, target, korean) {
  const groups = new Map();
  for (const declaration of scan.declarations.filter(({ targetNames = [] }) => targetNames.includes(target.name))) {
    const category = categoryFor(declaration, scan, target);
    if (!category) continue;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(declaration);
  }

  const targetInterfaces = scan.interfaces.filter(({ targetNames = [] }) => targetNames.includes(target.name));
  const results = [];
  for (const [category, declarations] of groups) {
    const symbols = new Set(declarations.map(({ name }) => name));
    const files = new Set(declarations.map(({ evidence }) => evidence.file));
    const interactions = scan.interactions.filter(({ targetNames = [], enclosingDeclaration, evidence }) =>
      targetNames.includes(target.name) && (enclosingDeclaration ? symbols.has(enclosingDeclaration) : files.has(evidence?.file)));
    const dependencies = scan.dependencies.filter(({ targetNames = [], fromSymbol, toSymbol, evidence }) =>
      targetNames.includes(target.name)
      && ((fromSymbol ? symbols.has(fromSymbol) : files.has(evidence?.file)) || (toSymbol && symbols.has(toSymbol))));
    const implementedInterfaces = targetInterfaces.filter(({ name }) => declarations.some(({ name: declarationName, conformances = [] }) => declarationName === name || conformances.includes(name)));
    const technologyEvidence = scan.imports.filter(({ targetNames = [], evidence, name }) => targetNames.includes(target.name) && files.has(evidence?.file) && TECH_IMPORTS.has(name));
    let score = 1;
    if (declarations.length > 1 || declarations.some(({ conformances = [], attributes = [] }) => conformances.length || attributes.length)) score += 1;
    if (interactions.length) score += 1;
    if (dependencies.length) score += 1;
    if (implementedInterfaces.length) score += 1;
    if (technologyEvidence.length) score += 1;
    if (score < 2) continue;
    const allEvidence = uniqueEvidence([
      ...interactions.map(({ evidence }) => evidence),
      ...implementedInterfaces.map(({ evidence }) => evidence),
      ...technologyEvidence.map(({ evidence }) => evidence),
      ...declarations.map(({ evidence }) => evidence),
      ...dependencies.map(({ evidence }) => evidence),
      ...declarations.filter(({ conformances = [] }) => conformances.length).map((declaration) => ({
        ...declaration.evidence,
        reason: `Conforms to ${declaration.conformances.join(", ")}`,
      })),
    ]);
    results.push({
      target,
      category,
      name: categoryName(category, korean),
      declarations,
      files,
      interactions,
      dependencies,
      implementedInterfaces,
      technologyEvidence,
      evidence: representativeEvidence(allEvidence),
      allEvidence,
      score,
    });
  }
  return results;
}

function candidateResponsibility(candidate, korean) {
  const symbols = candidate.declarations.map(({ name }) => name).slice(0, 4).join(", ");
  return korean
    ? `소스에서 확인된 ${symbols} 동작을 하나의 책임 경계로 묶습니다.`
    : `Groups the source-observed behavior of ${symbols} into one responsibility boundary.`;
}

function relationshipDescription(interaction, korean) {
  const payload = payloadNames(interaction.payloadKeys).join(" + ");
  if (interaction.kind === "message-reply") return korean ? `${payload || "메시지"}로 응답합니다.` : `Replies with ${payload || "a message"}.`;
  return korean ? `${payload || "메시지"}를 전송합니다.` : `Sends ${payload || "a message"}.`;
}

function communicationTechnology(technology) {
  const [family, api] = normalized(technology).split(".");
  return api ? `${family} · ${api}` : normalized(technology);
}

function applicationTargets(scan) {
  return scan.targets.filter(({ isTest, runtimeKind, productType }) =>
    !isTest && (runtimeKind?.endsWith("app") || runtimeKind === "extension" || /application|extension/i.test(productType ?? "")));
}

export function synthesizeC4Model(scan, { language = "ko" } = {}) {
  const korean = language === "ko";
  const usedElementIds = new Set();
  const usedRelationshipIds = new Set();
  const projectName = normalized(scan.project?.name) || "Apple Project";
  const systemId = uniqueId(projectName, usedElementIds);
  const personId = uniqueId("user", usedElementIds);
  const targets = applicationTargets(scan);
  const fallbackEvidence = scan.targets[0]?.evidence ?? { file: scan.files[0]?.path || "project.pbxproj", reason: "Project structure" };
  const elements = [];
  const relationships = [];
  const excludedCandidates = [];

  elements.push(
    {
      id: personId,
      type: "Person",
      name: korean ? "애플리케이션 사용자" : "Application user",
      description: korean ? `${projectName}의 소스에서 확인된 진입점을 사용합니다.` : `Uses the source-confirmed application entry points of ${projectName}.`,
      responsibilities: [korean ? "확인된 사용자 진입점을 통해 애플리케이션을 사용합니다." : "Uses the application through confirmed user entry points."],
      inputs: [],
      outputs: [],
      implementationStatus: "review-required",
      evidence: [fallbackEvidence],
      confidence: "review-required",
    },
    {
      id: systemId,
      type: "Software System",
      name: projectName,
      description: korean ? `${projectName} Xcode 프로젝트에 선언된 애플리케이션 실행 경계를 나타냅니다.` : `Represents the application runtimes declared by the ${projectName} Xcode project.`,
      responsibilities: [korean ? "Xcode 대상에 선언된 실행 경계를 소유합니다." : "Owns the runtime boundaries declared by Xcode targets."],
      inputs: [],
      outputs: [],
      implementationStatus: "review-required",
      evidence: uniqueEvidence([fallbackEvidence, ...targets.map(({ evidence }) => evidence)]),
      confidence: "confirmed",
    },
  );

  const addRelationship = (candidate) => {
    const id = uniqueId(candidate.id || `${candidate.from}-${candidate.to}-${candidate.description}`, usedRelationshipIds);
    const relationship = {
      ...candidate,
      id,
      evidence: uniqueEvidence(candidate.evidence ?? [...(candidate.senderEvidence ?? []), ...(candidate.receiverEvidence ?? [])]),
      senderEvidence: uniqueEvidence(candidate.senderEvidence ?? []),
      receiverEvidence: uniqueEvidence(candidate.receiverEvidence ?? []),
    };
    relationships.push(relationship);
    return relationship;
  };

  addRelationship({
    from: personId,
    to: systemId,
    description: korean ? "애플리케이션을 사용합니다." : "Uses the application.",
    purpose: korean ? "사용자 진입" : "user entry",
    senderEvidence: [fallbackEvidence],
    receiverEvidence: [fallbackEvidence],
    confidence: "review-required",
  });

  const targetToContainer = new Map();
  const componentBySymbol = new Map();
  const componentByTargetAndFile = new Map();
  const componentByTargetAndCategory = new Map();

  for (const target of targets) {
    const containerId = uniqueId(`${target.name}-${target.runtimeKind}`, usedElementIds);
    targetToContainer.set(target.name, containerId);
    const targetEvidence = uniqueEvidence([
      target.evidence,
      ...scan.declarations.filter(({ targetNames = [], attributes = [] }) => targetNames.includes(target.name) && attributes.includes("@main")).map(({ evidence }) => evidence),
    ]);
    const description = targetDescription(target, korean);
    elements.push({
      id: containerId,
      parentId: systemId,
      type: "Container",
      name: target.name,
      description,
      responsibilities: [description],
      inputs: [],
      outputs: [],
      implementationStatus: "review-required",
      technology: technologyForTarget(target),
      evidence: targetEvidence,
      confidence: "confirmed",
    });
    addRelationship({
      from: personId,
      to: containerId,
      description: korean ? `${target.name}의 확인된 사용자 인터페이스를 사용합니다.` : `Uses the confirmed user interface of ${target.name}.`,
      technology: `${platformForTarget(target)} UI`,
      senderEvidence: targetEvidence,
      receiverEvidence: targetEvidence,
      confidence: "review-required",
    });

    for (const candidate of componentCandidates(scan, target, korean)) {
      const componentId = uniqueId(`${containerId}-${candidate.category}`, usedElementIds);
      const responsibility = candidateResponsibility(candidate, korean);
      const { inputs, outputs } = inputsAndOutputsFor(candidate, korean);
      elements.push({
        id: componentId,
        parentId: containerId,
        type: "Component",
        name: candidate.name,
        description: responsibility,
        responsibilities: [responsibility],
        inputs,
        outputs,
        implementationStatus: candidate.interactions.length || candidate.dependencies.length ? "active" : "review-required",
        evidenceSummary: korean
          ? `${candidate.allEvidence.length}개의 소스 위치와 ${candidate.score}개의 경계 신호에서 식별했습니다.`
          : `Identified from ${candidate.allEvidence.length} source locations and ${candidate.score} boundary signals.`,
        technology: componentTechnology(candidate, scan),
        evidence: candidate.evidence,
        confidence: candidate.score >= 3 ? "confirmed" : "review-required",
      });
      componentByTargetAndCategory.set(`${target.name}:${candidate.category}`, componentId);
      for (const declaration of candidate.declarations) componentBySymbol.set(`${target.name}:${declaration.name}`, componentId);
      for (const file of candidate.files) {
        const key = `${target.name}:${file}`;
        if (!componentByTargetAndFile.has(key)) componentByTargetAndFile.set(key, []);
        if (!componentByTargetAndFile.get(key).includes(componentId)) componentByTargetAndFile.get(key).push(componentId);
      }
      if (candidate.category === "presentation") {
        const evidence = candidate.declarations[0]?.evidence;
        addRelationship({
          from: personId,
          to: componentId,
          description: korean ? "확인된 화면 경계를 통해 애플리케이션 동작을 요청합니다." : "Requests application behavior through the confirmed presentation boundary.",
          technology: `${platformForTarget(target)} UI`,
          senderEvidence: [evidence],
          receiverEvidence: [evidence],
          confidence: "review-required",
        });
      }
    }
  }

  for (const target of scan.targets.filter(({ isTest }) => isTest)) {
    excludedCandidates.push({ name: target.name, type: "Container", reason: "Excluded test target from runtime C4 containers.", evidence: [target.evidence] });
  }

  for (const target of targets) {
    for (const dependency of scan.dependencies.filter(({ targetNames = [], fromSymbol, toSymbol }) => targetNames.includes(target.name) && fromSymbol && toSymbol)) {
      const from = componentBySymbol.get(`${target.name}:${dependency.fromSymbol}`);
      let to = componentBySymbol.get(`${target.name}:${dependency.toSymbol}`);
      if (!to) {
        const implementation = scan.declarations.find(({ targetNames = [], conformances = [] }) => targetNames.includes(target.name) && conformances.includes(dependency.toSymbol));
        if (implementation) to = componentBySymbol.get(`${target.name}:${implementation.name}`);
      }
      if (!from || !to || from === to) continue;
      if (relationships.some((relationship) => relationship.from === from && relationship.to === to && /protocol/.test(relationship.technology ?? ""))) continue;
      const receiverEvidence = scan.interfaces
        .filter(({ name, targetNames = [] }) => name === dependency.toSymbol && targetNames.includes(target.name))
        .map(({ evidence }) => evidence);
      addRelationship({
        from,
        to,
        description: korean ? `${dependency.toSymbol} 경계에 동작을 위임합니다.` : `Delegates behavior through ${dependency.toSymbol}.`,
        technology: `Swift protocol · ${dependency.toSymbol}`,
        senderEvidence: [dependency.evidence],
        receiverEvidence,
        confidence: receiverEvidence.length ? "confirmed" : "review-required",
      });
    }
  }

  const messageSends = scan.interactions.filter(({ kind, targetNames = [] }) => kind === "message-send" && targetNames.some((name) => targetToContainer.has(name)));
  for (const send of messageSends) {
    const sourceTargetName = send.targetNames.find((name) => targetToContainer.has(name));
    const sourceTarget = targets.find(({ name }) => name === sourceTargetName);
    const sourceContainer = targetToContainer.get(sourceTargetName);
    const expectedReceive = /transferUserInfo|updateApplicationContext/.test(send.technology) ? "didReceiveUserInfo" : "didReceiveMessage";
    const candidates = scan.interactions
      .filter(({ kind, technology, targetNames = [] }) => kind === "message-receive" && technology.endsWith(expectedReceive) && targetNames.some((name) => name !== sourceTargetName && targetToContainer.has(name)))
      .map((receive) => ({ receive, overlap: (send.payloadKeys ?? []).filter((key) => (receive.payloadKeys ?? []).includes(key)).length }))
      .sort((first, second) => second.overlap - first.overlap);
    const paired = candidates.find(({ overlap }) => overlap > 0) ?? candidates[0];
    const dependencyTargets = (sourceTarget?.targetDependencyNames ?? []).filter((name) => targetToContainer.has(name) && name !== sourceTargetName);
    const targetName = paired?.receive.targetNames.find((name) => name !== sourceTargetName && targetToContainer.has(name))
      ?? (dependencyTargets.length === 1 ? dependencyTargets[0] : undefined);
    const targetContainer = targetToContainer.get(targetName);
    if (!sourceContainer || !targetContainer) {
      excludedCandidates.push({
        name: `${sourceTargetName ?? "unknown"} message send`,
        type: "Relationship",
        reason: "A send call was observed, but no receiving target or explicit target dependency identified its destination.",
        evidence: [send.evidence],
      });
      continue;
    }
    const description = relationshipDescription(send, korean);
    const technology = communicationTechnology(send.technology);
    const senderEvidence = [send.evidence];
    const receiverEvidence = paired ? [paired.receive.evidence] : [];
    const payload = payloadNames(send.payloadKeys).join(" + ");
    const confidence = paired?.overlap ? "confirmed" : "review-required";
    addRelationship({ from: sourceContainer, to: targetContainer, description, purpose: description, payload, technology, senderEvidence, receiverEvidence, confidence });

    const senderComponent = componentBySymbol.get(`${sourceTargetName}:${send.enclosingDeclaration}`)
      ?? componentByTargetAndFile.get(`${sourceTargetName}:${send.evidence.file}`)?.[0];
    if (senderComponent) addRelationship({ from: senderComponent, to: targetContainer, description, purpose: description, payload, technology, senderEvidence, receiverEvidence, confidence });

    const receiverComponent = paired && (componentBySymbol.get(`${targetName}:${paired.receive.enclosingDeclaration}`)
      ?? componentByTargetAndFile.get(`${targetName}:${paired.receive.evidence.file}`)?.[0]);
    if (receiverComponent) addRelationship({ from: sourceContainer, to: receiverComponent, description, purpose: description, payload, technology, senderEvidence, receiverEvidence, confidence });
  }

  const fileReadInteractions = scan.interactions.filter(({ kind, targetNames = [] }) => kind === "file-read" && targetNames.some((name) => targetToContainer.has(name)));
  if (fileReadInteractions.length > 0) {
    const storeId = uniqueId("external-file-store", usedElementIds);
    const storeEvidence = representativeEvidence(fileReadInteractions.map(({ evidence }) => evidence));
    elements.push({
      id: storeId,
      type: "Software System",
      external: true,
      visualRole: "data-store",
      name: korean ? "외부 파일 저장소" : "External File Store",
      description: korean ? "직접 확인된 보안 범위 URL을 통해 사용자가 선택한 파일을 제공합니다." : "Provides user-selected files through directly observed security-scoped URLs.",
      responsibilities: [korean ? "사용자가 소유한 파일과 선택된 URL을 제공합니다." : "Supplies user-owned files and their selected URLs."],
      inputs: [ioEntry(korean ? "사용자 소유 파일" : "User-owned file", storeEvidence)],
      outputs: [ioEntry(korean ? "보안 범위 파일 URL" : "Security-scoped file URL", storeEvidence)],
      implementationStatus: "external",
      technology: "Security-scoped URL",
      evidence: storeEvidence,
      confidence: "confirmed",
    });
    addRelationship({
      from: systemId,
      to: storeId,
      description: korean ? "사용자가 선택한 파일에 접근합니다." : "Accesses a user-selected file.",
      purpose: korean ? "파일 읽기" : "file read",
      senderEvidence: storeEvidence,
      receiverEvidence: storeEvidence,
      confidence: "confirmed",
    });
    for (const interaction of fileReadInteractions) {
      const targetName = interaction.targetNames.find((name) => targetToContainer.has(name));
      const containerId = targetToContainer.get(targetName);
      if (!containerId) continue;
      addRelationship({
        from: storeId,
        to: containerId,
        description: korean ? "선택한 파일 URL을 제공합니다." : "Provides the selected file URL.",
        payload: korean ? "파일 URL" : "File URL",
        technology: interaction.technology,
        senderEvidence: [interaction.evidence],
        receiverEvidence: [interaction.evidence],
        confidence: "confirmed",
      });
      const componentId = componentByTargetAndCategory.get(`${targetName}:file-access`)
        ?? componentByTargetAndFile.get(`${targetName}:${interaction.evidence.file}`)?.[0];
      if (componentId) addRelationship({
        from: storeId,
        to: componentId,
        description: korean ? "읽을 파일 URL을 제공합니다." : "Provides a file URL to read.",
        payload: korean ? "파일 URL" : "File URL",
        technology: interaction.technology,
        senderEvidence: [interaction.evidence],
        receiverEvidence: [interaction.evidence],
        confidence: "confirmed",
      });
    }
  }

  const persistenceInteractions = scan.interactions.filter(({ kind, technology, targetNames = [] }) =>
    /persistence-(?:read|write)/.test(kind) && /SwiftData|CoreData/.test(technology) && targetNames.some((name) => targetToContainer.has(name)));
  if (persistenceInteractions.length > 0) {
    const storeId = uniqueId(`${systemId}-application-data-store`, usedElementIds);
    const storeEvidence = uniqueEvidence(persistenceInteractions.map(({ evidence }) => evidence));
    elements.push({
      id: storeId,
      parentId: systemId,
      type: "Container",
      name: korean ? "애플리케이션 데이터 저장소" : "Application Data Store",
      description: korean ? "직접 확인된 읽기와 쓰기로 애플리케이션 소유 데이터를 저장합니다." : "Stores application-owned data through directly observed reads and writes.",
      responsibilities: [korean ? "애플리케이션 소유 데이터를 영속화합니다." : "Persists application-owned data."],
      inputs: [ioEntry(korean ? "저장할 애플리케이션 데이터" : "Application data to persist", storeEvidence)],
      outputs: [ioEntry(korean ? "조회된 애플리케이션 데이터" : "Queried application data", storeEvidence)],
      implementationStatus: "active",
      technology: [...new Set(persistenceInteractions.map(({ technology }) => technology))].join(" · "),
      visualRole: "data-store",
      evidence: storeEvidence,
      confidence: "confirmed",
    });
    for (const interaction of persistenceInteractions) {
      const targetName = interaction.targetNames.find((name) => targetToContainer.has(name));
      const containerId = targetToContainer.get(targetName);
      if (!containerId) continue;
      const writing = interaction.kind === "persistence-write";
      const description = writing
        ? (korean ? "애플리케이션 데이터를 저장합니다." : "Persists application data.")
        : (korean ? "저장된 애플리케이션 데이터를 조회합니다." : "Reads stored application data.");
      addRelationship({
        from: writing ? containerId : storeId,
        to: writing ? storeId : containerId,
        description,
        technology: interaction.technology,
        senderEvidence: [interaction.evidence],
        receiverEvidence: [interaction.evidence],
        confidence: "confirmed",
      });
      const componentId = componentBySymbol.get(`${targetName}:${interaction.enclosingDeclaration}`)
        ?? componentByTargetAndFile.get(`${targetName}:${interaction.evidence.file}`)?.[0];
      if (componentId) addRelationship({
        from: writing ? componentId : storeId,
        to: writing ? storeId : componentId,
        description,
        technology: interaction.technology,
        senderEvidence: [interaction.evidence],
        receiverEvidence: [interaction.evidence],
        confidence: "confirmed",
      });
    }
  }

  const qualifiedSymbols = new Set([...componentBySymbol.keys()].map((key) => key.split(":").at(-1)));
  for (const declaration of scan.declarations) {
    if (declaration.targetNames?.some((name) => targetToContainer.has(name)) && !qualifiedSymbols.has(declaration.name)) {
      excludedCandidates.push({
        name: declaration.name,
        type: "Component",
        reason: "Insufficient independent signals for a C4 Component boundary.",
        evidence: [declaration.evidence],
      });
    }
  }

  return {
    project: {
      name: projectName,
      description: korean ? "정적 Xcode와 소스 근거에서 생성한 C4 아키텍처 모델입니다." : "A C4 architecture model synthesized from static Xcode and source evidence.",
      language,
    },
    elements,
    relationships,
    excludedCandidates,
  };
}
