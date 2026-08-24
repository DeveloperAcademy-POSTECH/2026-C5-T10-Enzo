# RhythmTrainer C4 Architecture Explorer Design

## 목적

`2026-C4-T11`의 실제 앱 코드를 근거로, 엇박(RhythmTrainer) 시스템을 큰 맥락에서 시작해 실행 단위와 내부 컴포넌트까지 단계적으로 탐색하는 단일 HTML 문서를 만든다. 사용자는 다이어그램의 시스템 또는 컨테이너를 클릭해 C4 Level 1 → Level 2 → Level 3으로 내려가며, Level 3에서는 선택한 컴포넌트의 책임과 소스 근거를 확인한다.

결과 파일은 다음 위치에 둔다.

`/Users/yang-eunseo/Documents/ChatGPT/C5/rhythmtrainer-c4-explorer.html`

분석 대상 저장소는 읽기 전용으로 취급한다.

`/Users/yang-eunseo/Downloads/C4_즐/2026-C4-T11`

## 분석 기준

- 분석 기준 커밋: `bff9f2a6b38fe50e5f4f65c91ef95da402bd928f`
- 앱 소스: `RhythmTrainer/`, `RhythmTrainerWatch Watch App/`
- 빌드 구조: `RhythmTrainer.xcodeproj/project.pbxproj`
- 제외 대상: `build/`, 외부 패키지 체크아웃, 별도 `rhythmpractice` 프로토타입, 테스트 코드, 루트의 중복·고아 파일
- 기존 문서와 지식 그래프는 후보 구조를 찾는 데만 사용하고, 최종 관계는 Swift·Objective-C++·C++ 소스로 확인한다.

## 설계 원칙

1. 한 다이어그램에는 한 추상화 수준만 표시한다.
2. 모든 관계는 방향, 동사형 설명, 핵심 기술을 가진다.
3. 시스템·컨테이너·컴포넌트의 이름, 종류, 기술, 책임을 노드에 명시한다.
4. C4의 현재 구조를 우선하며, 계획되었지만 아직 연결되지 않은 코드는 경고 스타일로 구분한다.
5. 화면·클래스·함수를 전부 나열하지 않고 시스템을 설명하는 핵심 경계만 남긴다.
6. Level 4 코드 다이어그램은 만들지 않는다. Level 3 노드 선택은 다음 단계로 이동하지 않고 근거 패널만 갱신한다.
7. 인터넷 연결 없이 열리는 단일 HTML 파일로 만든다. CSS, 데이터, JavaScript, SVG를 모두 파일 안에 포함한다.

## 정보 구조와 탐색

상단에는 현재 위치를 나타내는 breadcrumb와 `L1 Context`, `L2 Container`, `L3 Component` 수준 표시를 둔다. `L4 Code`는 비활성 종착점으로 표시해 의도적으로 제외되었음을 알린다.

탐색 상태는 네 가지다.

1. `context`: 시스템 컨텍스트
2. `containers`: 엇박 시스템의 컨테이너
3. `iphone-components`: iPhone 앱 컴포넌트
4. `watch-components`: Watch 앱 컴포넌트

`context`의 엇박 시스템을 선택하면 `containers`로 이동한다. `containers`의 iPhone 앱 또는 Watch 앱을 선택하면 각자의 Level 3으로 이동한다. breadcrumb와 뒤로 가기 버튼으로 상위 수준에 복귀한다.

Level 3의 컴포넌트를 선택하면 오른쪽 근거 패널에 다음을 표시한다.

- 컴포넌트 책임
- 사용 기술
- 입력과 출력
- 관련 소스 파일
- 코드에서 확인한 설계 특징 또는 주의점

근거 패널은 Level 4가 아니다. 클래스·함수 내부 구조를 추가 다이어그램으로 펼치지 않는다.

## C4 Level 1 — System Context

### 요소

| 요소 | 종류 | 설명 |
| --- | --- | --- |
| 리듬을 연습하는 사용자 | Person | iPhone에서 곡을 고르고 Apple Watch를 착용해 팔을 흔들며 연습한다. |
| 엇박 리듬 훈련 시스템 | Software System | 음원을 온디바이스로 분석하고 Watch에서 실시간 박자 판정과 코칭을 수행한다. |
| 사용자 파일 저장소 | External Software System | Files/iCloud Drive 등에서 사용자가 선택한 입력 음원의 URL을 제공한다. 앱 번들 음원은 시스템 내부 리소스로 취급한다. |

### 관계

- 사용자는 엇박 시스템에서 곡 선택, 연습 시작, 진행 확인, 결과 확인을 수행한다.
- 엇박 시스템은 사용자 파일 저장소가 제공한 오디오 URL을 읽고 PCM으로 변환한다. 기술 표기는 `Security-scoped URL / AVFoundation`으로 한다.

### 핵심 메시지

별도 서버나 클라우드 분석기가 없는 온디바이스 시스템이며, iPhone과 paired Apple Watch가 하나의 제품 경험을 구성한다.

## C4 Level 2 — Container

### 요소

| 요소 | 종류·기술 | 책임 |
| --- | --- | --- |
| RhythmTrainer iPhone App | Container · SwiftUI, AVFoundation, ONNX Runtime | 곡 선택, 음원 변환, BeatThis 분석, 오디오·가사 재생, Watch 세션 조정, 결과 표시를 담당한다. |
| RhythmTrainer Watch App | Container · SwiftUI, CoreMotion, HealthKit | 곡과 BeatGrid를 수신하고 팔 스윙 감지, 박자 판정, 햅틱·경고, 결과 생성을 자체 수행한다. |
| 사용자 파일 저장소 | External Software System | iPhone 앱에 분석·재생할 음원 URL을 제공한다. |

### 관계

- 사용자 파일 저장소 → iPhone App: `음원 URL 제공 [Security-scoped URL]`
- iPhone App → Watch App: `Song + BeatGrid 전송 [WatchConnectivity transferUserInfo]`
- Watch App → iPhone App: `시작 시각·이탈 상태 전달 [WatchConnectivity sendMessage]`
- Watch App → iPhone App: `SessionResult 전송 [WatchConnectivity transferUserInfo]`
- iPhone App ↔ Watch App: `시계 오프셋 측정 [NTP-style ping over WCSession]`

### 컨테이너 경계 판단

BeatThis C++ 엔진과 ONNX 모델은 iPhone 앱 프로세스 안에서 브릿지로 호출되는 라이브러리이므로 별도 컨테이너가 아니라 iPhone 앱의 Level 3 컴포넌트로 둔다. SwiftData 모델과 저장소 타입은 코드에 존재하지만 앱 진입점에서 `ModelContainer`가 구성되지 않고 실제 세션 흐름에 주입되지 않으므로 Level 2의 활성 데이터 저장소로 표현하지 않는다.

## C4 Level 3 — iPhone App Components

### 요소

| 컴포넌트 | 기술 | 책임 | 대표 소스 |
| --- | --- | --- | --- |
| Presentation & Navigation | SwiftUI | 온보딩, 탭 셸, 곡 선택, 분석·연습·결과 화면을 구성한다. | `RhythmTrainer/RhythmTrainerApp.swift`, `AppRootView.swift`, `AppShellView.swift`, `Views/PracticeJourneyView.swift` |
| Practice Flow Coordinator | Combine, `@MainActor` | 곡 분석부터 Watch 준비, 연습, 종료, 결과까지 상태 전이를 조정한다. | `RhythmTrainer/ViewModels/AppFlowViewModel.swift` |
| Audio I/O & Playback | AVFoundation | 보안 범위 음원을 44.1kHz mono Float32 PCM으로 변환하고 예약 시각에 재생한다. | `Services/SongUploadService.swift`, `ViewModels/PhonePlaybackClock.swift` |
| Beat Analysis Adapter | Swift/Objective-C bridge | PCM을 네이티브 분석기로 전달하고 `BeatGrid`로 변환한다. | `Services/BeatAnalysisService.swift` |
| BeatThis Native Engine | Objective-C++, C++, ONNX Runtime | 멜 스펙트로그램, 추론, 후처리를 거쳐 beat time과 beat count를 추출한다. | `Services/Library/BeatThis_Bridging-Header/BeatThisBridge.mm`, `Services/Library/BeatThis_Source/beat_this_api.cpp` |
| Phone Connectivity Gateway | WatchConnectivity | Song·BeatGrid 전송, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리한다. | `WatchConnectivity/PhoneConnectivityManager.swift` |
| Result Scoring | Swift domain logic | 마디 정확도를 전체 점수와 가사 구간별 점수로 변환한다. | `Models/LyricScoring.swift`, `Views/SessionResultView.swift` |
| Persistence Repository | SwiftData | 세션과 BeatGrid 캐시용 모델·저장소 구현을 제공한다. 현재 앱 흐름에는 주입되지 않았다. | `Models/PracticeSessionStore.swift` |

### 관계

- Presentation → Practice Flow Coordinator: `사용자 행동 전달 / 화면 상태 구독`
- Practice Flow Coordinator → Audio I/O & Playback: `음원 PCM 변환 및 예약 재생`
- Practice Flow Coordinator → Beat Analysis Adapter: `PCM 분석 요청`
- Beat Analysis Adapter → BeatThis Native Engine: `detectBeats(samples, sampleRate)`
- Practice Flow Coordinator → Phone Connectivity Gateway: `곡 패키지 전송·세션 메시지 수신`
- Presentation & Navigation → Result Scoring: `SessionResult를 표시 점수로 변환`
- Practice Flow Coordinator ⇢ Persistence Repository: `저장·캐시 연결 예정`으로 표시하며 점선과 경고색을 사용한다. 현재 호출 관계처럼 표현하지 않는다.
- Phone Connectivity Gateway ↔ Watch App: `WCSession 메시지·큐잉 전송`

## C4 Level 3 — Watch App Components

### 요소

| 컴포넌트 | 기술 | 책임 | 대표 소스 |
| --- | --- | --- | --- |
| Watch UI Orchestrator | SwiftUI | waiting→ready→practicing→done 화면 상태와 서비스 수명주기를 연결한다. | `RhythmTrainerWatch Watch App/ContentView.swift` |
| Watch Connectivity Gateway | WatchConnectivity | Song·BeatGrid 수신, 시작·이탈·결과·종료 메시지를 처리한다. | `Services/WatchConnectivityManager.swift` |
| Motion Capture | CoreMotion | 50Hz deviceMotion에서 가속도 크기와 timestamp를 수집한다. | `Services/ArmSwingDetector.swift` |
| Swing Detector | Pure Swift state machine | 상승→하강→재상승 전환에서 팔 스윙 최저점을 검출하고 불응기로 중복을 제거한다. | `Services/SwingPeakDetector.swift` |
| Rhythm Judge | Combine, Timer | 곡 기준 시각, 카운트인, 정박 발화, 놓침 감지, 종료를 통합 조정한다. | `Services/RhythmJudge.swift` |
| Beat Matcher | Pure Swift | 가장 가까운 정박과 스윙을 비교해 정확·빠름·느림·놓침과 마디 정확도를 계산한다. | `Services/BeatMatcher.swift` |
| Rhythm Coach | Pure Swift state machine | 3연속 이탈 시 경고하고 2연속 정확 시 복귀하는 히스테리시스를 구현한다. | `Services/RhythmCoach.swift` |
| Background Runtime | HealthKit | `HKWorkoutSession`으로 화면이 꺼진 동안에도 판정 파이프라인 실행을 유지한다. | `Services/WorkoutSessionManager.swift` |

### 관계

- Watch Connectivity Gateway → Watch UI Orchestrator: `수신한 songID + BeatGrid 전달`
- Watch UI Orchestrator → Motion Capture: `센서 수집 시작·종료`
- Motion Capture → Swing Detector: `process(timestamp, acceleration magnitude)`
- Motion Capture → Rhythm Judge: `Swing Detector가 반환한 swing uptime 전달`
- Watch UI Orchestrator → Rhythm Judge: `BeatGrid load / 판정 start·stop`
- Rhythm Judge → Beat Matcher: `registerSwing / advance / barAccuracies`
- Rhythm Judge → Rhythm Coach: `판정 결과 기록`
- Rhythm Judge → Watch UI Orchestrator: `offBeat·finished 콜백`
- Watch UI Orchestrator → Background Runtime: `HKWorkoutSession start·stop`
- Watch UI Orchestrator → Watch Connectivity Gateway: `시작·이탈·SessionResult 전송`
- Watch Connectivity Gateway ↔ iPhone App: `WCSession 메시지·큐잉 전송`

## 시각 표현

- 내부 시스템·컨테이너·컴포넌트: C4 계열 파란색 표면
- 사용자: 짙은 남색 사람 형태 또는 명확한 `[Person]` 노드
- 외부 시스템·플랫폼 의존성: 중립 회색
- 현재 연결되지 않은 컴포넌트·관계: 호박색 경고 표면과 점선
- 관계: 단방향 화살표와 동사형 레이블, 기술은 대괄호 안에 표기
- 각 노드는 `이름`, `[종류: 기술]`, 한 문장 책임을 표시한다.
- 선택 가능 노드는 hover뿐 아니라 키보드 focus에서도 동일하게 식별된다.
- 화면 폭이 좁아지면 근거 패널을 다이어그램 아래로 이동하고 노드 글자가 겹치지 않도록 배치를 재구성한다.

## 구현 구조

한 HTML 파일 안에서 책임을 다음처럼 분리한다.

- `architectureModel`: 모든 view, node, relationship, detail 근거를 담는 정적 데이터
- `navigationState`: 현재 view, 선택한 node, breadcrumb 상태
- `renderDiagram(viewId)`: 해당 수준의 노드와 관계를 렌더링
- `renderEvidence(nodeId)`: 선택 노드의 근거 패널 갱신
- `navigateTo(viewId)`와 `navigateUp()`: L1→L3 탐색과 복귀
- `validateModel()`: 누락된 관계 끝점, 잘못된 drill-down 대상, Level 4 경로가 없는지 초기화 시 검사

렌더링은 외부 CDN 없이 HTML, CSS, inline SVG, JavaScript만 사용한다. 첫 화면은 JavaScript 오류가 발생해도 Level 1의 핵심 설명을 읽을 수 있는 구조로 둔다.

## 오류·불확실성 처리

- 모델 데이터가 잘못되어 관계 끝점이 없으면 해당 관계만 그리지 않고 콘솔에 명확한 오류를 남긴다.
- drill-down 대상이 없는 노드는 Level 3 근거 패널만 갱신한다.
- SwiftData 저장소처럼 구현 상태와 런타임 연결 상태가 다른 경우 시각적 경고와 설명을 함께 제공한다.
- 코드를 근거로 확인할 수 없는 서버, 백엔드, MusicKit 연동, 클라우드 저장소는 발명하지 않는다.
- 통신은 페어링된 실기기에서만 검증된다는 코드 주석을 WatchConnectivity 근거 패널에 표시한다.

## 접근성

- 탐색과 노드 선택은 실제 `button` 요소로 제공한다.
- 현재 수준과 선택 상태를 `aria-current`, `aria-pressed`, `aria-live="polite"`로 전달한다.
- 색상만으로 내부·외부·미배선 상태를 구분하지 않고 텍스트 종류와 선 스타일을 함께 사용한다.
- `prefers-reduced-motion`에서는 전환 애니메이션을 제거한다.
- 320px 이상 화면에서 가로 스크롤 없이 breadcrumb, 다이어그램, 근거 패널을 사용할 수 있게 한다.

## 검증 기준

1. HTML이 외부 네트워크 요청 없이 열린다.
2. 초기 화면이 Level 1이며 엇박 시스템을 선택하면 Level 2로 이동한다.
3. Level 2에서 iPhone App을 선택하면 iPhone Level 3이 열린다.
4. Level 2에서 Watch App을 선택하면 Watch Level 3이 열린다.
5. Level 3 노드 선택은 Level 4로 이동하지 않고 근거 패널만 갱신한다.
6. breadcrumb와 뒤로 가기가 정확한 상위 수준으로 복귀한다.
7. 모든 관계의 source와 target이 같은 view 안의 유효한 노드를 참조한다.
8. 모든 노드에 종류, 책임, 기술 또는 상태, 소스 근거가 존재한다.
9. 데스크톱과 모바일 폭에서 노드·관계 레이블·근거 패널이 겹치거나 잘리지 않는다.
10. 키보드만으로 모든 drill-down과 노드 선택을 수행할 수 있다.
11. 브라우저 콘솔 오류와 깨진 외부 리소스 요청이 없다.
12. 다이어그램의 핵심 관계가 위 소스 기반 관계 목록과 일치한다.

## 비목표

- Level 4 클래스·함수·코드 다이어그램
- 모든 SwiftUI 화면과 모델의 전수 나열
- 테스트 타깃과 빌드 스크립트의 상세 구조
- 런타임 소스 분석 또는 사용자가 파일을 업로드하는 기능
- 대상 앱 저장소의 코드·문서·설정 변경
- GitHub Pages 배포 또는 외부 호스팅
