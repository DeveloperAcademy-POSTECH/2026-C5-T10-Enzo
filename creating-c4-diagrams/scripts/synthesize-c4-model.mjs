const ROLE_PATTERN = /(App|View|Screen|Presentation|Coordinator|Flow|Manager|Connectivity|Bridge|Service|Repository|Store|Engine|Adapter|Gateway|Playback|Audio|Motion|Sampler|Judge|Matcher|Scor|Coach|Session|Persistence)/i;
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
  return [...new Map(items.filter((item) => item?.file).map((item) => [evidenceKey(item), { ...item }])).values()];
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

function technologyForTarget(target) {
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

function targetDescription(target, korean) {
  const platform = technologyForTarget(target).split(" · ").at(-1);
  if (target.runtimeKind === "watch-app") {
    return korean
      ? "손목 입력을 측정하고 연습 상태와 결과를 주고받는 Watch 애플리케이션입니다."
      : "Measures wrist input and exchanges practice state and results on Apple Watch.";
  }
  return korean
    ? `사용자 흐름을 조정하고 분석·재생·저장을 수행하는 ${platform} 애플리케이션입니다.`
    : `Coordinates user flows and performs analysis, playback, and persistence in the ${platform} application.`;
}

function responsibilityFor(name, korean) {
  const value = normalized(name);
  const pair = (ko, en) => korean ? ko : en;
  if (/Connectivity|SessionBridge|SessionAdapter|WCSession/i.test(value)) return pair("기기 간 메시지 전송·수신과 응답 흐름을 조정합니다.", "Coordinates cross-device message sending, receiving, and replies.");
  if (/Store|Repository|Persistence/i.test(value)) return pair("애플리케이션 데이터를 읽고 안전하게 저장합니다.", "Reads and safely persists application data.");
  if (/Motion|Sampler|Workout|Health/i.test(value)) return pair("기기 센서와 운동 세션에서 움직임 표본을 수집합니다.", "Collects motion samples from device sensors and workout sessions.");
  if (/BeatThis|Analysis|Analyzer|Engine/i.test(value)) return pair("오디오 표본을 분석해 박자 위치와 템포 정보를 생성합니다.", "Analyzes audio samples to produce beat positions and tempo information.");
  if (/Judge|Matcher|Scor|Coach/i.test(value)) return pair("사용자 움직임을 박자 기준과 비교해 판정과 코칭 결과를 생성합니다.", "Compares user motion with the beat grid to produce scoring and coaching results.");
  if (/Playback|Audio|Player/i.test(value)) return pair("음원을 재생하고 기준 재생 시각을 제공합니다.", "Plays audio and supplies the reference playback clock.");
  if (/View|Screen|Presentation|App$|Flow|Coordinator/i.test(value)) return pair("사용자 흐름을 표시하고 입력을 애플리케이션 동작으로 전달합니다.", "Presents the user flow and translates input into application actions.");
  if (/Bridge|Adapter|Gateway/i.test(value)) return pair("외부 런타임 또는 프레임워크 호출을 애플리케이션 인터페이스로 변환합니다.", "Adapts an external runtime or framework behind an application interface.");
  return pair(`${value}에 모인 소스 동작을 하나의 책임 경계로 캡슐화합니다.`, `Encapsulates the source behavior grouped around ${value}.`);
}

function responsibilityForCategory(category, name, korean) {
  const pair = (ko, en) => korean ? ko : en;
  const descriptions = {
    presentation: pair("온보딩, 곡 선택, 연습, 결과 화면을 구성하고 사용자 동작을 전달합니다.", "Composes onboarding, song selection, practice, and result screens and forwards user actions."),
    flow: pair("분석→Watch 준비→연습→종료→결과의 상태 전이를 조정합니다.", "Coordinates state transitions from analysis through Watch preparation, practice, finish, and results."),
    connectivity: pair("곡 패키지, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리합니다.", "Handles song packages, clock sync, start, off-beat, stop, and result messages."),
    persistence: pair("연습 세션과 BeatGrid 캐시를 읽고 저장합니다.", "Reads and stores practice sessions and the BeatGrid cache."),
    "motion-capture": pair("deviceMotion에서 사용자 가속도와 시각 표본을 수집합니다.", "Collects user-acceleration and timestamp samples from deviceMotion."),
    "swing-detection": pair("가속도 변화에서 팔 스윙의 기준 시각을 검출합니다.", "Detects the reference arm-swing timestamp from acceleration changes."),
    "rhythm-judge": pair("카운트인, 스윙 등록, 놓침 감지와 세션 결과 생성을 조정합니다.", "Coordinates count-in, swing registration, missed-beat detection, and session-result generation."),
    "beat-matcher": pair("가장 가까운 정박과 스윙을 비교해 정확·빠름·느림·놓침을 계산합니다.", "Compares swings with the nearest beat to calculate on-time, early, late, and missed verdicts."),
    "rhythm-coach": pair("연속 판정에 따라 이탈 경고와 정상 복귀 상태를 결정합니다.", "Determines off-beat alerts and recovery from consecutive verdicts."),
    "background-runtime": pair("HealthKit 운동 세션으로 화면이 꺼진 동안에도 센서와 판정을 유지합니다.", "Keeps sensors and scoring active while the screen is off using a HealthKit workout session."),
    "result-scoring": pair("세션 판정을 전체 점수와 가사 구간별 점수로 변환합니다.", "Converts session verdicts into overall and lyric-segment scores."),
    "beat-analysis": pair("PCM 오디오를 네이티브 분석기로 전달하고 결과를 BeatGrid로 변환합니다.", "Passes PCM audio to the native analyzer and converts its result into a BeatGrid."),
    "audio-playback": pair("선택 음원을 PCM으로 변환하고 기준 시각에 맞춰 재생합니다.", "Converts selected audio to PCM and plays it against the reference clock."),
    "native-engine": pair("멜 스펙트로그램, ONNX 추론과 후처리로 박자 위치와 템포를 추출합니다.", "Extracts beat positions and tempo through mel spectrograms, ONNX inference, and post-processing."),
    adapter: pair("프레임워크 호출을 안정적인 애플리케이션 인터페이스로 변환합니다.", "Adapts framework calls behind a stable application interface."),
  };
  return descriptions[category] ?? responsibilityFor(name, korean);
}

function ioEntry(name, evidence) {
  return { name, evidence: uniqueEvidence(evidence) };
}

function payloadLabel(key, korean) {
  const labels = korean ? {
    song: "곡",
    grid: "BeatGrid",
    songPackage: "Song + BeatGrid",
    songStartWatch: "연습 시작 신호",
    sessionStop: "세션 종료 신호",
    syncPing: "시계 오프셋 측정값",
    songData: "음원 데이터",
    beatGrid: "박자 지도",
    sessionStart: "연습 시작 신호",
    sessionResult: "연습 결과",
    alertState: "박자 이탈 상태",
    pingT1: "시계 오프셋 측정값",
    pingT2: "시계 오프셋 측정값",
    pingT3: "시계 오프셋 측정값",
    request: "연습 요청",
  } : {
    song: "song",
    grid: "BeatGrid",
    songPackage: "Song + BeatGrid",
    songStartWatch: "practice start signal",
    sessionStop: "session stop signal",
    syncPing: "clock offset sample",
    songData: "audio data",
    beatGrid: "beat grid",
    sessionStart: "practice start signal",
    sessionResult: "practice result",
    alertState: "off-beat state",
    pingT1: "clock offset sample",
    pingT2: "clock offset sample",
    pingT3: "clock offset sample",
    request: "practice request",
  };
  return labels[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

function payloadNames(keys, korean) {
  const keySet = new Set(keys ?? []);
  if (keySet.has("songPackage") || (keySet.has("song") && (keySet.has("grid") || keySet.has("beatGrid")))) {
    const remaining = [...keySet].filter((key) => !["songPackage", "song", "grid", "beatGrid"].includes(key));
    return ["Song", "BeatGrid", ...new Set(remaining.map((key) => payloadLabel(key, korean)))];
  }
  return [...new Set((keys ?? []).map((key) => payloadLabel(key, korean)))];
}

function inputsAndOutputsFor({ name, category, interactions, evidence }, korean) {
  const inputs = [];
  const outputs = [];
  const add = (list, label, sourceEvidence) => {
    if (!label || list.some(({ name: existing }) => existing === label)) return;
    list.push(ioEntry(label, sourceEvidence));
  };

  for (const interaction of interactions) {
    const sourceEvidence = [interaction.evidence];
    const payload = payloadNames(interaction.payloadKeys, korean).join(" + ");
    if (interaction.kind === "message-receive") add(inputs, payload || (korean ? "수신 메시지" : "received message"), sourceEvidence);
    if (interaction.kind === "message-send") add(outputs, payload || (korean ? "전송 메시지" : "outgoing message"), sourceEvidence);
    if (interaction.kind === "message-reply") add(outputs, payload || (korean ? "응답 메시지" : "reply message"), sourceEvidence);
    if (interaction.kind === "persistence-read") add(inputs, korean ? "저장된 애플리케이션 데이터" : "stored application data", sourceEvidence);
    if (interaction.kind === "persistence-write") {
      add(inputs, korean ? "저장할 애플리케이션 데이터" : "application data to persist", sourceEvidence);
      add(outputs, korean ? "영속화된 데이터" : "persisted data", sourceEvidence);
    }
    if (interaction.kind === "sensor-read") {
      add(inputs, korean ? "기기 모션 표본" : "device motion samples", sourceEvidence);
      add(outputs, korean ? "정규화된 움직임 스트림" : "normalized motion stream", sourceEvidence);
    }
    if (interaction.kind === "network-request") {
      add(inputs, korean ? "외부 서비스 응답" : "external service response", sourceEvidence);
      add(outputs, korean ? "네트워크 요청" : "network request", sourceEvidence);
    }
    if (interaction.kind === "file-read") {
      add(inputs, korean ? "사용자가 선택한 오디오 URL" : "user-selected audio URL", sourceEvidence);
      add(outputs, korean ? "디코딩할 오디오 표본" : "audio samples to decode", sourceEvidence);
    }
  }

  if (["presentation", "flow"].includes(category) || /View|Screen|Presentation|App$|Flow|Coordinator/i.test(name)) {
    add(inputs, korean ? "사용자 입력" : "user input", evidence);
    add(outputs, korean ? "화면 상태와 동작 요청" : "screen state and action requests", evidence);
  }
  if (["beat-analysis", "native-engine"].includes(category) || /BeatThis|Analysis|Analyzer|Engine/i.test(name)) {
    add(inputs, korean ? "PCM 오디오 표본" : "PCM audio samples", evidence);
    add(outputs, korean ? "박자 위치와 BPM" : "beat positions and BPM", evidence);
  }
  const categoryIo = korean ? {
    "rhythm-judge": [["BeatGrid", "곡 시작 시각", "스윙 시각"], ["판정 스트림", "이탈 상태", "SessionResult"]],
    "beat-matcher": [["beat times", "스윙 시각", "현재 재생 위치"], ["Verdict", "마디 정확도"]],
    "rhythm-coach": [["BeatMatcher 판정"], ["정상 / 이탈 상태"]],
    "motion-capture": [["CMDeviceMotion 표본"], ["시각 + 가속도 크기", "스윙 시각 콜백"]],
    "swing-detection": [["시각 + 가속도 크기"], ["스윙 최저점 시각"]],
    "background-runtime": [["시작 / 종료", "HealthKit 권한"], ["백그라운드 운동 세션 상태"]],
    "result-scoring": [["SessionResult", "BeatGrid", "가사"], ["전체 점수", "가사 구간별 점수"]],
    "audio-playback": [["보안 범위 오디오 URL", "곡 시작 기준 시각"], ["PCM 오디오 표본", "재생 위치"]],
    persistence: [["PracticeSession", "BeatGrid"], ["저장된 세션", "캐시된 BeatGrid"]],
    flow: [["선택한 곡", "Watch 세션 메시지"], ["화면 상태", "분석·재생·통신 명령"]],
    presentation: [["사용자 행동", "연습 화면 상태", "SessionResult"], ["곡 선택", "시작·종료 명령", "결과 표현"]],
  } : {
    "rhythm-judge": [["BeatGrid", "song start clock", "swing clock"], ["verdict stream", "off-beat state", "SessionResult"]],
    "beat-matcher": [["beat times", "swing clock", "playback position"], ["Verdict", "bar accuracy"]],
    "rhythm-coach": [["BeatMatcher verdict"], ["normal / off-beat state"]],
    "motion-capture": [["CMDeviceMotion samples"], ["timestamp + acceleration magnitude", "swing clock callback"]],
    "swing-detection": [["timestamp + acceleration magnitude"], ["swing trough timestamp"]],
    "background-runtime": [["start / stop", "HealthKit authorization"], ["background workout session state"]],
    "result-scoring": [["SessionResult", "BeatGrid", "lyrics"], ["overall score", "lyric segment scores"]],
    "audio-playback": [["security-scoped audio URL", "song start clock"], ["PCM audio samples", "playback position"]],
    persistence: [["PracticeSession", "BeatGrid"], ["stored session", "cached BeatGrid"]],
    flow: [["selected song", "Watch session messages"], ["screen state", "analysis, playback, and communication commands"]],
    presentation: [["user actions", "practice screen state", "SessionResult"], ["song selection", "start/stop commands", "result presentation"]],
  };
  for (const label of categoryIo[category]?.[0] ?? []) add(inputs, label, evidence);
  for (const label of categoryIo[category]?.[1] ?? []) add(outputs, label, evidence);
  return { inputs, outputs };
}

function componentTechnology(candidate, scan) {
  const imports = scan.imports
    .filter((item) => candidate.files.has(item.evidence?.file) && TECH_IMPORTS.has(item.name))
    .map(({ name }) => name);
  const language = [...candidate.files].some((file) => /\.(?:m|mm|h|hpp|c|cc|cpp)$/.test(file)) ? "Objective-C++" : "Swift";
  const technologies = [language, ...imports];
  if (["beat-analysis", "native-engine"].includes(candidate.category) && scan.artifacts.some(({ targetNames = [] }) => targetNames.includes(candidate.target.name))) {
    technologies.push("ONNX Runtime");
  }
  return [...new Set(technologies)].join(" · ");
}

function categoryFor(declaration, scan, target) {
  if (declaration.kind === "protocol" || declaration.kind === "enum" || DATA_TYPE_PATTERN.test(declaration.name)) return null;
  const file = declaration.evidence?.file ?? "";
  const text = `${declaration.name} ${file}`;
  const imports = scan.imports.filter(({ targetNames = [], evidence }) => targetNames.includes(target.name) && evidence?.file === file).map(({ name }) => name);
  const interactions = scan.interactions.filter(({ targetNames = [], enclosingDeclaration, evidence }) =>
    targetNames.includes(target.name) && (enclosingDeclaration ? enclosingDeclaration === declaration.name : evidence?.file === file));
  const native = /\.(?:m|mm|h|hpp|c|cc|cpp)$/.test(file);
  if (native && /BeatThis|Inference|Postprocessor|MelSpectrogram|Resampler|Engine|Bridge/i.test(text)) return "native-engine";
  if (/Connectivity|WCSession|SessionBridge|SessionAdapter/i.test(text) || interactions.some(({ kind }) => /^message-/.test(kind))) return "connectivity";
  if (/Repository|Persistence|Store|Cache/i.test(text)) return "persistence";
  if (/BeatMatcher/i.test(text)) return "beat-matcher";
  if (/RhythmCoach|Coach$/i.test(declaration.name)) return "rhythm-coach";
  if (/RhythmJudge|Judge$/i.test(declaration.name)) return "rhythm-judge";
  if (/SwingPeakDetector/i.test(text)) return "swing-detection";
  if (/Motion|Sampler|ArmSwingDetector/i.test(text) || interactions.some(({ kind }) => kind === "sensor-read")) return "motion-capture";
  if (/Workout|Background/i.test(text) || imports.includes("HealthKit")) return "background-runtime";
  if (/LyricScor|ResultScor|ScoreCalculator/i.test(text)) return "result-scoring";
  if (/BeatAnalysis|BeatAnalyzer|AnalysisService|Analyzer/i.test(text)) return "beat-analysis";
  if (/Playback|Audio|SongUpload|Player|Clock/i.test(text) || imports.includes("AVFoundation")) return "audio-playback";
  if (/AppFlow|Journey|Coordinator|FlowController/i.test(text)) return "flow";
  if (declaration.attributes?.includes("@main") || declaration.conformances?.includes("App") || declaration.conformances?.includes("View") || /View|Screen|Presentation/i.test(text)) return "presentation";
  if (interactions.some(({ kind }) => /^persistence-/.test(kind))) return "persistence";
  if (/Bridge|Adapter|Gateway|Service/i.test(text) && ROLE_PATTERN.test(text)) return "adapter";
  return null;
}

function categoryName(category, target, korean) {
  const watch = target.runtimeKind === "watch-app";
  const names = korean ? {
    presentation: watch ? "Watch 프레젠테이션" : "프레젠테이션과 내비게이션",
    flow: "연습 흐름 코디네이터",
    connectivity: watch ? "Watch 연결 게이트웨이" : "Phone 연결 게이트웨이",
    persistence: "영속성 저장소",
    "motion-capture": "모션 캡처",
    "swing-detection": "팔 스윙 검출기",
    "rhythm-judge": "리듬 판정 조정기",
    "beat-matcher": "박자 매처",
    "rhythm-coach": "리듬 코치",
    "background-runtime": "백그라운드 운동 런타임",
    "result-scoring": "결과 점수 계산기",
    "beat-analysis": "박자 분석 어댑터",
    "audio-playback": "오디오 입출력과 재생",
    "native-engine": "BeatThis 네이티브 엔진",
    adapter: "통합 어댑터",
  } : {
    presentation: watch ? "Watch Presentation" : "Presentation & Navigation",
    flow: "Practice Flow Coordinator",
    connectivity: watch ? "Watch Connectivity Gateway" : "Phone Connectivity Gateway",
    persistence: "Persistence Repository",
    "motion-capture": "Motion Capture",
    "swing-detection": "Arm Swing Detector",
    "rhythm-judge": "Rhythm Judge Coordinator",
    "beat-matcher": "Beat Matcher",
    "rhythm-coach": "Rhythm Coach",
    "background-runtime": "Background Workout Runtime",
    "result-scoring": "Result Scoring",
    "beat-analysis": "Beat Analysis Adapter",
    "audio-playback": "Audio I/O & Playback",
    "native-engine": "BeatThis Native Engine",
    adapter: "Integration Adapter",
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
      (targetNames.includes(target.name) && (fromSymbol ? symbols.has(fromSymbol) : files.has(evidence?.file)))
      || (toSymbol && symbols.has(toSymbol)));
    const implementedInterfaces = targetInterfaces.filter(({ name }) => declarations.some(({ name: declarationName, conformances = [] }) => declarationName === name || conformances.includes(name)));
    const technologyEvidence = scan.imports.filter(({ targetNames = [], evidence, name }) => targetNames.includes(target.name) && files.has(evidence?.file) && TECH_IMPORTS.has(name));
    let score = 1;
    if (declarations.length > 1 || declarations.some(({ conformances = [], attributes = [] }) => conformances.length || attributes.length)) score += 1;
    if (interactions.length) score += 1;
    if (dependencies.length) score += 1;
    if (implementedInterfaces.length) score += 1;
    if (technologyEvidence.length) score += 1;
    if (score < 2) continue;
    results.push({
      target,
      category,
      name: categoryName(category, target, korean),
      declarations,
      files,
      interactions,
      dependencies,
      implementedInterfaces,
      technologyEvidence,
      score,
    });
  }
  return results;
}

function relationshipDescription(interaction, korean) {
  const labels = payloadNames(interaction.payloadKeys, korean);
  const payload = labels.join(" + ");
  if (/ping|시계 오프셋/.test(payload)) return korean ? "시계 오프셋 측정값을 요청합니다." : "Requests a clock offset sample.";
  if (interaction.kind === "message-reply") return korean ? `${payload || "측정값"}을 응답합니다.` : `Replies with ${payload || "the measured value"}.`;
  if (interaction.kind === "message-send") {
    const packageSuffix = labels.length > 1 ? (korean ? " 패키지" : " package") : "";
    return korean ? `${payload || "메시지"}${packageSuffix}를 전송합니다.` : `Sends the ${payload || "message"}${packageSuffix}.`;
  }
  return korean ? "메시지를 전달합니다." : "Delivers a message.";
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
  const elements = [];
  const relationships = [];
  const excludedCandidates = [];
  const targets = applicationTargets(scan);
  const fallbackEvidence = scan.targets[0]?.evidence ?? { file: scan.files[0]?.path || "project.pbxproj", reason: "Project structure" };

  elements.push(
    {
      id: personId,
      type: "Person",
      name: korean ? "리듬을 연습하는 사용자" : "Rhythm learner",
      description: korean ? "곡을 선택하고 iPhone과 Apple Watch를 사용해 리듬을 연습합니다." : "Selects a song and practices rhythm using iPhone and Apple Watch.",
      responsibilities: [korean ? "연습을 선택·시작하고 결과를 확인합니다." : "Selects and starts practice, then reviews the result."],
      inputs: [],
      outputs: [],
      implementationStatus: "active",
      evidence: [fallbackEvidence],
      confidence: "inferred",
    },
    {
      id: systemId,
      type: "Software System",
      name: projectName,
      description: korean ? "사용자 음원을 분석하고 손목 움직임을 바탕으로 실시간 박자 판정과 코칭을 제공합니다." : "Analyzes user audio and provides real-time beat scoring and coaching from wrist motion.",
      responsibilities: [korean ? "iPhone과 Watch의 연습 흐름, 분석, 판정, 결과 저장을 소유합니다." : "Owns iPhone and Watch practice flow, analysis, scoring, and result persistence."],
      inputs: [],
      outputs: [],
      implementationStatus: "active",
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
    description: korean ? "곡을 선택하고 리듬 연습과 결과 확인을 수행합니다." : "Selects songs, practices rhythm, and reviews results.",
    purpose: korean ? "리듬 연습" : "rhythm practice",
    senderEvidence: [fallbackEvidence],
    receiverEvidence: [fallbackEvidence],
    confidence: "inferred",
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
      implementationStatus: "active",
      technology: technologyForTarget(target),
      evidence: targetEvidence,
      confidence: "confirmed",
    });
    addRelationship({
      from: personId,
      to: containerId,
      description: target.runtimeKind === "watch-app"
        ? (korean ? "손목에서 연습을 시작하고 피드백을 확인합니다." : "Starts practice and reviews feedback on the wrist.")
        : (korean ? "곡을 선택하고 연습 흐름을 조작합니다." : "Selects a song and controls the practice flow."),
      technology: target.runtimeKind === "watch-app" ? "Apple Watch UI" : "iPhone UI",
      senderEvidence: targetEvidence,
      receiverEvidence: targetEvidence,
      confidence: "inferred",
    });

    for (const candidate of componentCandidates(scan, target, korean)) {
      const componentId = uniqueId(`${containerId}-${candidate.category}`, usedElementIds);
      const responsibility = responsibilityForCategory(candidate.category, candidate.name, korean);
      const allSignalEvidence = uniqueEvidence([
        ...candidate.interactions.map(({ evidence }) => evidence),
        ...candidate.implementedInterfaces.map(({ evidence }) => evidence),
        ...candidate.technologyEvidence.map(({ evidence }) => evidence),
        ...candidate.declarations.map(({ evidence }) => evidence),
        ...candidate.dependencies.map(({ evidence }) => evidence),
        ...candidate.declarations.filter(({ conformances = [] }) => conformances.length).map((declaration) => ({
          ...declaration.evidence,
          reason: `Conforms to ${declaration.conformances.join(", ")}`,
        })),
      ]);
      const signalEvidence = representativeEvidence(allSignalEvidence);
      const { inputs, outputs } = inputsAndOutputsFor({
        name: candidate.name,
        category: candidate.category,
        interactions: candidate.interactions,
        evidence: signalEvidence,
      }, korean);
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
          ? `${allSignalEvidence.length}개의 소스 근거와 ${candidate.score}개의 경계 신호로 식별했습니다.`
          : `Identified from ${allSignalEvidence.length} source locations and ${candidate.score} boundary signals.`,
        technology: componentTechnology(candidate, scan),
        evidence: signalEvidence,
        confidence: candidate.score >= 3 ? "confirmed" : "inferred",
      });
      componentByTargetAndCategory.set(`${target.name}:${candidate.category}`, componentId);
      for (const declaration of candidate.declarations) componentBySymbol.set(`${target.name}:${declaration.name}`, componentId);
      for (const file of candidate.files) {
        const fileKey = `${target.name}:${file}`;
        if (!componentByTargetAndFile.has(fileKey)) componentByTargetAndFile.set(fileKey, []);
        if (!componentByTargetAndFile.get(fileKey).includes(componentId)) componentByTargetAndFile.get(fileKey).push(componentId);
      }

      if (["presentation", "flow"].includes(candidate.category)) {
        const interactionEvidence = candidate.declarations[0]?.evidence;
        addRelationship({
          from: personId,
          to: componentId,
          description: korean ? "화면에서 연습 흐름을 조작합니다." : "Controls the practice flow through the UI.",
          technology: target.runtimeKind === "watch-app" ? "watchOS UI" : "SwiftUI",
          senderEvidence: [interactionEvidence],
          receiverEvidence: [interactionEvidence],
          confidence: "inferred",
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
        const implementation = scan.declarations.find(({ targetNames = [], conformances = [] }) =>
          targetNames.includes(target.name) && conformances.includes(dependency.toSymbol));
        if (implementation) to = componentBySymbol.get(`${target.name}:${implementation.name}`);
      }
      if (!from || !to || from === to) continue;
      if (relationships.some((relationship) => relationship.from === from && relationship.to === to && /protocol/.test(relationship.technology ?? ""))) continue;
      addRelationship({
        from,
        to,
        description: korean ? `${dependency.toSymbol} 책임에 동작을 위임합니다.` : `Delegates behavior through ${dependency.toSymbol}.`,
        technology: `Swift protocol · ${dependency.toSymbol}`,
        senderEvidence: [dependency.evidence],
        receiverEvidence: scan.interfaces.filter(({ name }) => name === dependency.toSymbol).map(({ evidence }) => evidence),
        confidence: "confirmed",
      });
    }
  }

  const messageSends = scan.interactions.filter(({ kind, targetNames = [] }) => kind === "message-send" && targetNames.some((name) => targetToContainer.has(name)));
  for (const send of messageSends) {
    const sourceTargetName = send.targetNames.find((name) => targetToContainer.has(name));
    const sourceContainer = targetToContainer.get(sourceTargetName);
    const expectedReceive = /transferUserInfo|updateApplicationContext/.test(send.technology) ? "didReceiveUserInfo" : "didReceiveMessage";
    const candidates = scan.interactions
      .filter(({ kind, technology, targetNames = [] }) => kind === "message-receive" && technology.endsWith(expectedReceive) && targetNames.some((name) => name !== sourceTargetName && targetToContainer.has(name)))
      .map((receive) => ({
        receive,
        overlap: (send.payloadKeys ?? []).filter((key) => (receive.payloadKeys ?? []).includes(key)).length,
      }))
      .sort((first, second) => second.overlap - first.overlap);
    const paired = candidates.find(({ overlap }) => overlap > 0) ?? candidates[0];
    const targetName = paired?.receive.targetNames.find((name) => name !== sourceTargetName && targetToContainer.has(name))
      ?? targets.find(({ name }) => name !== sourceTargetName)?.name;
    const targetContainer = targetToContainer.get(targetName);
    if (!sourceContainer || !targetContainer) continue;
    const description = relationshipDescription(send, korean);
    const technology = communicationTechnology(send.technology);
    const senderEvidence = [send.evidence];
    const receiverEvidence = paired ? [paired.receive.evidence] : [];
    const payload = payloadNames(send.payloadKeys, korean).join(" + ");
    addRelationship({
      from: sourceContainer,
      to: targetContainer,
      description,
      purpose: description,
      payload,
      technology,
      senderEvidence,
      receiverEvidence,
      confidence: paired?.overlap ? "confirmed" : "review-required",
    });

    const senderComponent = componentBySymbol.get(`${sourceTargetName}:${send.enclosingDeclaration}`)
      ?? componentByTargetAndFile.get(`${sourceTargetName}:${send.evidence.file}`)?.[0];
    if (senderComponent) addRelationship({
      from: senderComponent,
      to: targetContainer,
      description,
      purpose: description,
      payload,
      technology,
      senderEvidence,
      receiverEvidence,
      confidence: paired?.overlap ? "confirmed" : "review-required",
    });

    const receiverComponent = paired && (componentBySymbol.get(`${targetName}:${paired.receive.enclosingDeclaration}`)
      ?? componentByTargetAndFile.get(`${targetName}:${paired.receive.evidence.file}`)?.[0]);
    if (receiverComponent) addRelationship({
      from: sourceContainer,
      to: receiverComponent,
      description,
      purpose: description,
      payload,
      technology,
      senderEvidence,
      receiverEvidence,
      confidence: paired?.overlap ? "confirmed" : "review-required",
    });
  }

  const fileReadInteractions = scan.interactions.filter(({ kind, targetNames = [] }) =>
    kind === "file-read" && targetNames.some((name) => targetToContainer.has(name)));
  if (fileReadInteractions.length > 0) {
    const fileStoreId = uniqueId("user-file-store", usedElementIds);
    const fileStoreEvidence = representativeEvidence(fileReadInteractions.map(({ evidence }) => evidence));
    elements.push({
      id: fileStoreId,
      type: "Software System",
      external: true,
      visualRole: "data-store",
      name: korean ? "사용자 파일 저장소" : "User File Store",
      description: korean
        ? "Files 또는 iCloud Drive에 있는 사용자가 선택한 음원의 보안 범위 URL을 제공합니다."
        : "Provides security-scoped URLs for user-selected audio stored in Files or iCloud Drive.",
      responsibilities: [korean ? "사용자가 소유한 오디오 파일을 보관하고 선택된 파일 URL을 제공합니다." : "Stores user-owned audio and supplies the selected file URL."],
      inputs: [ioEntry(korean ? "사용자가 보관한 오디오 파일" : "user-owned audio file", fileStoreEvidence)],
      outputs: [ioEntry(korean ? "보안 범위 오디오 URL" : "security-scoped audio URL", fileStoreEvidence)],
      implementationStatus: "external",
      technology: "Files · iCloud Drive",
      evidenceSummary: korean
        ? `${fileStoreEvidence.length}개의 보안 범위 파일 접근 근거로 식별했습니다.`
        : `Identified from ${fileStoreEvidence.length} security-scoped file access locations.`,
      evidence: fileStoreEvidence,
      confidence: "confirmed",
    });

    addRelationship({
      from: systemId,
      to: fileStoreId,
      description: korean ? "분석할 사용자 음원에 접근합니다." : "Accesses the user-selected audio to analyze.",
      purpose: korean ? "사용자 음원 읽기" : "read user audio",
      senderEvidence: fileStoreEvidence,
      receiverEvidence: fileStoreEvidence,
      confidence: "confirmed",
    });

    const readsByTarget = new Map();
    for (const interaction of fileReadInteractions) {
      const targetName = interaction.targetNames.find((name) => targetToContainer.has(name));
      if (!targetName) continue;
      if (!readsByTarget.has(targetName)) readsByTarget.set(targetName, []);
      readsByTarget.get(targetName).push(interaction);
    }
    for (const [targetName, interactions] of readsByTarget) {
      const interactionEvidence = representativeEvidence(interactions.map(({ evidence }) => evidence));
      const containerId = targetToContainer.get(targetName);
      addRelationship({
        from: fileStoreId,
        to: containerId,
        description: korean ? "선택한 음원의 보안 범위 URL을 제공합니다." : "Provides the selected audio through a security-scoped URL.",
        purpose: korean ? "선택 음원 제공" : "provide selected audio",
        payload: korean ? "오디오 URL" : "audio URL",
        technology: "Security-scoped URL · AVFoundation",
        senderEvidence: interactionEvidence,
        receiverEvidence: interactionEvidence,
        confidence: "confirmed",
      });

      const componentId = componentByTargetAndCategory.get(`${targetName}:audio-playback`)
        ?? componentByTargetAndFile.get(`${targetName}:${interactions[0].evidence.file}`)?.[0];
      if (componentId) addRelationship({
        from: fileStoreId,
        to: componentId,
        description: korean ? "선택한 음원을 디코딩과 재생을 위해 제공합니다." : "Provides selected audio for decoding and playback.",
        purpose: korean ? "오디오 파일 읽기" : "read audio file",
        payload: korean ? "오디오 URL" : "audio URL",
        technology: "Security-scoped URL · AVFoundation",
        senderEvidence: interactionEvidence,
        receiverEvidence: interactionEvidence,
        confidence: "confirmed",
      });
    }
  }

  const swiftDataInteractions = scan.interactions.filter(({ kind, technology }) => /persistence-(?:read|write)/.test(kind) && /SwiftData|CoreData/.test(technology));
  if (swiftDataInteractions.length > 0) {
    const storeId = uniqueId(`${systemId}-application-data-store`, usedElementIds);
    const storeEvidence = uniqueEvidence(swiftDataInteractions.map(({ evidence }) => evidence));
    elements.push({
      id: storeId,
      parentId: systemId,
      type: "Container",
      name: korean ? "연습 데이터 저장소" : "Practice Data Store",
      description: korean ? "연습 세션, 판정 결과, 사용자 진행 상태를 기기에 저장합니다." : "Stores practice sessions, scoring results, and user progress on device.",
      responsibilities: [korean ? "애플리케이션이 소유한 연습 데이터를 영속화합니다." : "Persists practice data owned by the application."],
      inputs: [ioEntry(korean ? "저장할 연습 데이터" : "practice data to persist", storeEvidence)],
      outputs: [ioEntry(korean ? "조회된 연습 데이터" : "queried practice data", storeEvidence)],
      implementationStatus: "active",
      technology: [...new Set(swiftDataInteractions.map(({ technology }) => technology))].join(" · "),
      visualRole: "data-store",
      evidence: storeEvidence,
      confidence: "confirmed",
    });
    for (const interaction of swiftDataInteractions) {
      const targetName = interaction.targetNames?.find((name) => targetToContainer.has(name));
      const containerId = targetToContainer.get(targetName);
      if (!containerId) continue;
      const writing = interaction.kind === "persistence-write";
      const from = writing ? containerId : storeId;
      const to = writing ? storeId : containerId;
      addRelationship({
        from,
        to,
        description: writing
          ? (korean ? "연습 결과와 진행 상태를 저장합니다." : "Persists practice results and progress.")
          : (korean ? "저장된 연습 기록을 조회합니다." : "Reads stored practice records."),
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
        description: writing
          ? (korean ? "연습 결과와 진행 상태를 저장합니다." : "Persists practice results and progress.")
          : (korean ? "저장된 연습 기록을 조회합니다." : "Reads stored practice records."),
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
      description: korean ? "정적 Xcode·소스 근거에서 생성한 C4 아키텍처 모델입니다." : "A C4 architecture model synthesized from static Xcode and source evidence.",
      language,
    },
    elements,
    relationships,
    excludedCandidates,
  };
}
