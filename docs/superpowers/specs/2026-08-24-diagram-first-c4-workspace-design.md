# RhythmTrainer Diagram-first C4 Workspace Design

## 상태

- 작성일: 2026-08-24
- 대상: `rhythmtrainer-c4-explorer.html`
- 선행 설계: `2026-08-24-rhythmtrainer-c4-explorer-design.md`
- 결정: 기존 문서형 C4 Explorer를 SVG 중심의 데스크톱 작업공간으로 재구성한다.
- 분석 기준 커밋: `bff9f2a6b38fe50e5f4f65c91ef95da402bd928f`

이 문서는 기존 C4 모델의 분석 범위를 바꾸지 않고, 다이어그램을 탐색하는 방식과 시각 표기 체계를 재설계한다. 기존 설계 문서에서 정의한 L1 System Context, L2 Container, 두 개의 L3 Component View와 코드 근거는 유지하되, C4 공식 지침에 맞춰 관계 방향과 보조 요소를 다시 검토한다.

## 목적

현재 화면은 제목, 설명, 다이어그램, 관계 목록, 근거 패널이 위에서 아래로 이어지는 문서형 웹페이지다. 다이어그램 영역이 여러 콘텐츠 블록 중 하나로 취급되어 아키텍처를 공간적으로 탐색하기 어렵고, 향후 Mac 앱으로 발전시킬 작업 도구의 인상도 약하다.

새 화면은 다음 경험을 목표로 한다.

1. 앱을 열면 다이어그램이 화면의 주인공으로 보인다.
2. 사용자는 Figma와 유사한 공간 문법으로 캔버스를 이동하고 확대·축소한다.
3. 좌우 사이드바를 독립적으로 숨기거나 펼쳐 작업 공간을 조절한다.
4. 노드의 실루엣만으로 사람, 애플리케이션, 저장소 같은 역할을 빠르게 추측할 수 있다.
5. 모든 화살표는 관계의 방향, 의도, 기술 또는 프로토콜을 다이어그램 안에서 직접 설명한다.
6. L1에서 L2, L3으로 내려가는 C4의 선택적 확대 구조를 유지한다.
7. 실제 코드에 존재하지 않는 시스템, 컨테이너, 데이터 저장소를 시각적 완성도를 위해 발명하지 않는다.

## C4 준수 기준

시각 스타일은 C4 공식 예시에서 영감을 받되, C4 모델이 특정 도형이나 색을 강제하지 않는다는 원칙을 따른다. 준수 여부는 파란 사각형을 사용했는지가 아니라 다음 정보가 다이어그램 자체에서 이해되는지로 판단한다.

- 각 다이어그램에는 종류와 범위를 포함한 제목이 있다.
- 각 요소에는 이름, C4 타입, 짧은 책임 설명이 있다.
- Container와 Component에는 기술이 명시된다.
- 각 관계는 한 방향만 나타낸다.
- 각 화살표에는 방향과 일치하는 구체적인 동사형 설명이 있다.
- 프로세스 간 통신 관계에는 기술 또는 프로토콜이 명시된다.
- 도형, 색, 선, 화살표의 의미를 범례에서 설명한다.
- 한 화면은 하나의 C4 추상화 수준을 중심으로 구성한다.

참고 기준:

- <https://c4model.com/diagrams/notation>
- <https://c4model.com/diagrams/checklist>
- <https://c4model.com/diagrams/system-context>
- <https://c4model.com/diagrams/container>
- <https://c4model.com/diagrams/component>
- <https://youtu.be/x2-rSnhpw0g>

## 선택한 기술 접근

### SVG 중심 다이어그램 렌더러

노드, 경계, 관계선, 화살표 머리, 관계 라벨을 하나의 SVG 좌표계에 렌더링한다. 중앙 viewport는 SVG의 하나의 world group에 pan과 zoom transform을 적용한다. 좌우 사이드바와 상·하단 도구막대는 일반 HTML로 유지한다.

이 접근을 선택한 이유는 다음과 같다.

- 노드와 관계가 동일한 좌표계를 사용하므로 이동·확대 중 어긋나지 않는다.
- 사람, 문서, 앱 창, 저장소처럼 서로 다른 실루엣을 경로와 도형으로 정확히 표현할 수 있다.
- 곡선 관계, 양방향으로 오가는 별도 화살표, 라벨 배경과 경계선을 정밀하게 배치할 수 있다.
- 각 SVG node group에 접근 가능한 이름과 키보드 이벤트를 제공할 수 있다.
- 현재 단일 HTML, 무의존성, 오프라인 실행 조건을 유지할 수 있다.

Canvas/WebGL은 현재 노드 수에 비해 복잡하고 접근성이 떨어지므로 사용하지 않는다. 기존 HTML 노드와 SVG 관계선의 혼합 구조도 pan·zoom 시 좌표 동기화와 시각적 일관성이 약하므로 교체한다.

## 앱 셸

### 전체 구조

화면은 문서의 세로 흐름이 아니라 브라우저 viewport 전체를 사용하는 데스크톱 작업공간이다.

```text
┌───────────────┬─────────────────────────────────┬──────────────────┐
│ Views/Layers  │  Top toolbar                    │ Inspector        │
│               ├─────────────────────────────────┤                  │
│               │                                 │                  │
│               │       SVG diagram canvas        │                  │
│               │                                 │                  │
│               │        Floating tools           │                  │
└───────────────┴─────────────────────────────────┴──────────────────┘
```

- 중앙 캔버스는 좌우 패널을 제외한 모든 가용 공간을 차지한다.
- 큰 hero 제목, 문서형 소개 블록, 별도의 관계 흐름 목록, 페이지 footer는 제거한다.
- 출처와 분석 커밋은 오른쪽 Inspector의 `Model` 탭과 도움말에서 확인한다.
- 상단과 하단 도구막대는 캔버스 위에 떠 있는 기능 레이어로 취급한다.

### 초기 상태

- 왼쪽 패널: 열림
- 오른쪽 Inspector: 닫힘
- 현재 View: L1 System Context
- 캔버스: 다이어그램 전체 맞춤
- 도구: Select
- 선택된 노드: 없음

노드를 선택하면 오른쪽 Inspector가 오른쪽에서 열린다. 사용자가 Inspector를 닫은 뒤 다른 노드를 선택하면 다시 연다. 두 패널은 서로 독립적으로 접고 펼칠 수 있다.

### 왼쪽 패널

왼쪽 패널은 `Views`와 `Layers` 두 탭을 가진다.

`Views` 탭:

- L1 System Context
- L2 Container Diagram
- L3 iPhone Components
- L3 Watch Components
- L4 Code는 생성하지 않으며 목록에도 활성 View로 표시하지 않는다.

현재 View와 부모·자식 관계를 계층적으로 표시한다. 아직 부모 View를 거치지 않았더라도 사용자는 목록에서 원하는 View로 직접 이동할 수 있다.

`Layers` 탭:

- 현재 View의 system/container boundary
- 사람과 외부 시스템
- 현재 범위의 주요 요소
- 관계

레이어 항목을 선택하면 캔버스의 대응 노드를 선택하고 Inspector를 연다. 첫 버전에서는 사용자가 요소를 이동하거나 숨기거나 순서를 바꾸는 편집 기능은 제공하지 않는다. 이 탭은 탐색과 선택을 위한 읽기 전용 구조다.

### 오른쪽 Inspector

Inspector는 선택한 요소에 대한 정보를 보여주는 읽기 전용 패널이다.

- `Overview`: 이름, C4 타입, 기술, 책임, 구현 상태
- `Flow`: 선택 요소로 들어오는 관계와 나가는 관계
- `Evidence`: 입력, 출력, 관련 소스 파일, 코드 분석 근거
- `Model`: 현재 View의 범위, 분석 커밋, 모델 경고

관계의 주 설명은 항상 캔버스 화살표에 표시한다. `Flow` 탭은 별도의 관계 목록을 상시 노출하기 위한 영역이 아니라, 선택한 요소 주변의 관계를 자세히 검토하는 보조 수단이다.

Inspector는 오른쪽에서 들어오고 닫을 때 같은 방향으로 되돌아간다. 배경을 막는 modal이 아니므로 scrim을 사용하지 않는다.

## 캔버스 상호작용

### 이동

- Mac 트랙패드 두 손가락 이동: x/y delta를 그대로 사용해 양방향 pan
- 마우스 wheel: 세로 pan
- `Shift + wheel`: 가로 pan
- `Space + drag`: 임시 Hand 도구로 pan
- Hand 도구 선택 후 drag: 지속적인 pan
- 가운데 마우스 버튼 drag: pan

drag 중 캔버스는 포인터를 1:1로 따라간다. pointer capture를 사용해 포인터가 viewport 밖으로 나가도 추적을 유지한다. 경계에서 즉시 멈추지 않고 작은 저항 여유를 허용하되, 다이어그램을 완전히 잃어버릴 수 있을 정도로 멀리 이동하지는 못하게 한다.

### 확대·축소

- 트랙패드 pinch: 포인터 위치를 중심으로 zoom
- `Command/Ctrl + +`, `Command/Ctrl + -`: 단계별 zoom
- `Command/Ctrl + 0`: 현재 View 전체 맞춤
- 하단 `-`, 배율, `+`, Fit 버튼 제공
- 지원 범위: 25%~200%

zoom은 viewport 중앙이 아니라 포인터 아래 world 좌표를 고정한 채 이루어진다. View 전환 시 새 다이어그램은 전체 맞춤으로 시작한다. 같은 View 안에서 Inspector나 패널을 열고 닫을 때는 사용자의 pan/zoom 위치를 보존한다.

### 선택과 깊이 이동

- 한 번 클릭: 노드 선택과 Inspector 열기
- 더블 클릭: drill-down 대상이 있으면 다음 C4 View로 이동
- 노드 안의 `Open L2` 또는 `Open L3` affordance: 한 번 클릭으로 동일한 drill-down 수행
- `Enter`: 선택한 drill-down 가능 노드를 연다.
- `Escape`: 선택을 해제하고 Inspector를 닫는다.
- breadcrumb와 왼쪽 Views 목록: 상·하위 View로 이동

단일 클릭이 즉시 View를 바꾸지 않게 하여 사용자가 노드 설명과 관계를 먼저 살펴볼 수 있게 한다. drill-down 가능한 노드는 hover, focus, selection 상태에서만 명확한 열기 affordance를 보여준다.

## 상단과 하단 도구

상단 toolbar:

- 왼쪽 패널 toggle
- breadcrumb: `Context / RhythmTrainer / iPhone App`
- 현재 View 종류와 범위
- 오른쪽 Inspector toggle
- 도움말과 범례

하단 floating toolbar:

- Select
- Hand
- Fit view
- Zoom out
- 현재 배율
- Zoom in
- Reset view

도구는 캔버스보다 앞에 떠 있지만 불필요하게 넓은 고정 bar가 되지 않는다. system font, 간결한 아이콘, tooltips, 즉각적인 pressed feedback을 사용한다.

## 의미 기반 노드 표기

### C4 타입과 시각적 역할의 분리

모델은 `type`과 `visualRole`을 별도로 가진다.

- `type`: Person, Software System, Container, Component 같은 C4 추상화
- `visualRole`: person, application, mobileApplication, dataStore, component 같은 역할 기반 실루엣

예를 들어 `사용자 파일 저장소`는 L1에서 `External Software System`이지만 `visualRole: dataStore`를 사용한다. 원통형 실루엣은 저장 역할을 알리지만, 노드의 명시적 타입은 여전히 External Software System이다. 반대로 `Persistence Repository`는 저장 관련 코드라도 C4 Component이므로 `visualRole: component`를 유지한다.

### 실루엣

Person:

- 원형 머리와 어깨·몸통이 하나의 외곽을 이루는 사람형 카드
- 본문에는 이름, `[Person]`, 한 문장 책임을 표시
- 사람을 단순 아이콘으로만 표시하지 않고 텍스트 영역과 결합한다.

Software System:

- 큰 파일 또는 문서의 접힌 모서리를 연상시키는 외곽
- 시스템 이름, `[Software System]`, 책임을 표시
- drill-down 가능한 시스템에는 작은 `Open L2` affordance를 표시

Application Container:

- 실행되는 앱 창 또는 디바이스 화면을 연상시키는 상단 chrome과 본문
- iPhone과 Watch는 같은 Container 문법을 공유하면서 작은 device cue로 구분
- `[Container: 기술]`과 책임을 표시

Data/File Store:

- 상단과 하단의 타원으로 깊이를 표현하는 원통 또는 적층형 저장소 외곽
- 실제 데이터·파일 저장 역할에만 사용
- 외부 저장소도 같은 실루엣을 유지하고 색과 타입 라벨로 외부임을 표시

Component:

- 모듈 또는 퍼즐 조각을 암시하는 작은 header cue를 가진 단순 카드
- 정보 밀도가 높은 L3에서 읽기 쉬운 사각형을 기본으로 한다.

### 상태 스타일

- 내부 요소: 파란 계열 표면
- Person: 더 짙은 남색
- 외부 요소: 중립 회색
- 구현됐지만 미배선: 호박색 accent와 점선 외곽, 명시적인 상태 문구
- 선택: 색만 바꾸지 않고 외곽 focus ring과 selection handle을 함께 표시

색은 C4 타입을 대신하지 않는다. 흑백이나 색각 이상 환경에서도 실루엣, 선 스타일, 타입 라벨로 의미를 구분할 수 있어야 한다.

## System 및 Container 경계

L1은 하나의 Software System을 중심에 두고 사람과 외부 시스템을 주위에 배치한다. 별도의 내부 boundary는 필요하지 않다.

L2는 `엇박 리듬 훈련 시스템 [Software System]` 점선 경계 안에 iPhone App과 Watch App을 둔다. Person과 사용자 파일 저장소는 경계 밖에 둔다.

각 L3는 하나의 Container를 점선 경계로 표시하고 그 안에 해당 컴포넌트를 둔다. 직접 연결되는 Person, 외부 Software System, 다른 Container는 경계 밖의 supporting element로 표시한다.

## View별 내용 보정

### L1 System Context

주요 요소:

- 리듬을 연습하는 사용자 `[Person]`
- 엇박 리듬 훈련 시스템 `[Software System]`
- 사용자 파일 저장소 `[External Software System]`, `visualRole: dataStore`

L1에서는 사람 노드에 기술을 붙이지 않는다. Software System의 구현 기술도 카드 본문에서 제거하고 책임과 환경만 설명한다. 관계에는 사용자의 목표와 시스템 간 데이터 흐름을 설명하되 저수준 API 호출은 노출하지 않는다.

### L2 Container

기존 View에 Person을 supporting element로 다시 표시한다. 이는 새 사용자를 발명하는 것이 아니라 L1의 사용자가 어떤 Container와 직접 상호작용하는지를 보여주는 것이다.

시스템 경계 내부:

- RhythmTrainer iPhone App `[Container: SwiftUI, AVFoundation, ONNX Runtime]`
- RhythmTrainer Watch App `[Container: SwiftUI, CoreMotion, HealthKit]`

경계 외부:

- 리듬을 연습하는 사용자 `[Person]`
- 사용자 파일 저장소 `[External Software System]`

시계 동기화는 하나의 모호한 양방향 관계가 아니라 요청과 응답을 나타내는 두 개의 단방향 관계로 모델링한다.

### L3 iPhone Components

컨테이너 경계 안에는 기존 핵심 컴포넌트를 유지한다. 경계 밖에는 직접 연결되는 사용자, 사용자 파일 저장소, Watch App을 supporting element로 표시한다.

기존의 복합·양방향 문구는 다음처럼 분리한다.

- Presentation → Practice Flow: 사용자 명령 전달
- Practice Flow → Presentation: 화면 상태와 결과 제공
- Practice Flow → Phone Connectivity: 곡 패키지와 제어 명령 전달
- Phone Connectivity → Practice Flow: Watch 세션 이벤트 전달
- Phone Connectivity → Watch App: Song, BeatGrid, 제어 신호 전송
- Watch App → Phone Connectivity: 시작, 이탈, SessionResult 전송

Persistence Repository는 실제 활성 Data Store로 승격하지 않는다. 미배선 Component로 유지하고 실제 호출 관계가 아닌 gap 관계는 점선으로 표시한다.

### L3 Watch Components

컨테이너 경계 안에는 기존 Watch 핵심 컴포넌트를 유지한다. 경계 밖에는 iPhone App과 사용자를 supporting element로 표시한다.

- 사용자 → Watch UI: 연습 시작·종료
- 사용자 → Motion Capture: 팔 움직임 제공
- iPhone App → Watch Connectivity: Song, BeatGrid, 제어 신호 전송
- Watch Connectivity → iPhone App: 시작, 이탈, SessionResult 전송

내부 컴포넌트 관계는 기존 코드 분석 결과를 유지하되 한 화살표에 두 방향의 의도를 섞지 않는다.

## 관계선과 라벨

별도의 `관계 흐름` 영역과 R1, R2 번호 표기는 제거한다. 모든 관계 정보는 해당 화살표 위에 직접 표시한다.

라벨 구성:

```text
구체적인 동사형 관계 설명
[기술 또는 프로토콜]
```

예:

```text
Song + BeatGrid를 전송합니다
[WCSession · transferUserInfo]
```

규칙:

- 화살표는 source에서 target으로 향하는 단방향이다.
- “사용”, “교환” 같은 단독·양방향 표현을 피한다.
- 같은 두 요소 사이에 여러 관계가 있으면 곡선 offset으로 분리한다.
- 반대 방향 관계는 서로 다른 경로와 화살표 머리를 가진다.
- 라벨은 선의 중간 또는 읽기 좋은 구간에 불투명도가 높은 작은 배경과 함께 배치한다.
- 라벨 배경은 선을 가리되 캔버스와 구분되는 과도한 카드처럼 보이지 않게 한다.
- 기술 정보가 없는 L1 관계는 두 번째 줄을 생략한다.
- 관계선과 라벨은 zoom 중에도 같은 world group 안에서 함께 변환된다.

자동 배치만으로 라벨 충돌을 완전히 해결하려 하지 않는다. 각 View의 관계는 제한된 수이고 장기 문서이므로, 모델에 선택적 `waypoints`와 `labelPosition`을 저장해 사람이 읽기 좋은 경로를 명시할 수 있게 한다.

## 다이어그램 모델

기존 `architectureModel`을 다음 개념으로 확장한다.

```text
View
  id, level, title, scopeName, description
  worldSize
  boundaries[]
  nodes[]
  relationships[]

Node
  id, name, type, visualRole, technology, description
  status, drilldown, evidence, inputs, outputs
  x, y, width, height

Relationship
  id, from, to, description, technology, status
  sourceAnchor, targetAnchor, waypoints, labelPosition
```

`description`은 화살표 방향에 맞는 문장이다. 기존 `label` 필드는 마이그레이션 동안만 읽고 최종 모델에서는 `description`으로 통일한다.

pan, zoom, panel open state, selected node는 모델이 아니라 UI state로 관리한다. View별 viewport 상태는 메모리에 보존하되 새로고침 후 영구 저장하지 않는다.

## 렌더링 책임

한 HTML 파일 안에서 다음 책임을 함수 또는 작은 모듈 단위로 분리한다.

- model validation: C4 View, node, relationship 무결성 검사
- workspace state: 현재 View, 선택, 도구, 패널, viewport transform
- view navigation: breadcrumb, Views 탭, drill-down, 상위 View 복귀
- viewport controller: pan, zoom, fit, pointer/keyboard gesture
- node renderer: `visualRole`별 SVG geometry와 텍스트
- relationship renderer: anchor, waypoint, path, arrow marker, inline label
- inspector renderer: Overview, Flow, Evidence, Model 탭
- accessibility controller: focus, keyboard action, live announcement

각 단위는 정적 모델을 직접 변경하지 않고 명시적인 state와 입력을 받아 DOM을 갱신한다.

## Apple식 인터랙션 원칙

- 입력 피드백은 pointer down부터 즉시 보인다.
- pan은 포인터를 1:1로 추적하고 grab offset을 보존한다.
- 패널은 나타난 방향과 같은 경로로 사라진다.
- 패널 전환 중에도 사용자가 다시 toggle할 수 있어야 한다.
- 패널에는 기본적으로 bounce를 사용하지 않고 짧은 critically damped 전환을 사용한다.
- toolbar와 side panel은 필요한 범위에서만 반투명 material을 사용하고 텍스트 대비를 우선한다.
- 캔버스 배경과 노드는 과도한 gradient, glow, 장식용 badge를 피한다.
- system font와 macOS에 익숙한 pointer, hand, inspector 패턴을 사용한다.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`를 각각 처리한다.

## 반응형 정책

이 작업공간은 Mac 앱 방향을 검증하는 desktop-first 도구다.

- 1200px 이상: 좌우 고정 side panel과 중앙 canvas
- 800~1199px: 한 번에 한 side panel만 열 수 있으며 canvas 위 overlay panel로 표시
- 799px 이하: canvas를 유지하고 Views와 Inspector를 modal이 아닌 side sheet로 제공

작은 화면에서도 문서형 카드 목록으로 완전히 바꾸지 않는다. pan, zoom, View 이동, 노드 선택이라는 핵심 공간 경험을 유지한다.

## 접근성

- 모든 toolbar control은 실제 button과 명확한 accessible name을 가진다.
- SVG 노드는 `tabindex`, role, 이름·타입·책임을 포함한 접근 가능한 설명을 가진다.
- Tab은 chrome과 노드를 논리적인 순서로 이동한다.
- Enter는 drill-down, Space는 선택 또는 Hand modifier와 충돌하지 않도록 focus 상태에 따라 처리한다.
- 현재 View 변경, 노드 선택, Inspector 열림은 필요한 경우 live region으로 알린다.
- 선택·외부·미배선 상태는 색만으로 표현하지 않는다.
- 텍스트가 200% 확대되어도 Inspector와 toolbar control이 잘리거나 겹치지 않는다.
- reduced motion에서는 slide를 짧은 cross-fade 또는 즉시 전환으로 대체한다.

## 오류 처리

- 관계의 source 또는 target이 없으면 해당 관계만 생략하고 Model Inspector에 검증 오류를 표시한다.
- 알 수 없는 `visualRole`은 접근 가능한 generic component card로 대체한다.
- drill-down 대상 View가 없으면 노드는 선택 가능하지만 Open affordance는 표시하지 않는다.
- 선택된 노드가 View 변경 후 존재하지 않으면 selection을 해제하고 Inspector를 닫는다.
- viewport transform이 유효하지 않거나 다이어그램을 잃어버리면 Fit view로 복구한다.
- JavaScript 초기화가 실패하면 L1의 제목, 범위, 주요 요소 요약을 읽을 수 있는 fallback을 제공한다.
- 외부 CDN, font, icon, script 요청은 사용하지 않는다.

## 검증 기준

### 모델과 C4 표기

1. 모든 View는 종류와 범위를 포함한 제목과 범례를 가진다.
2. 모든 node는 name, type, description을 가진다.
3. 모든 Container와 Component는 technology를 가진다.
4. 모든 relationship은 유효한 source, target, 방향과 일치하는 구체적 description을 가진다.
5. Container 사이 관계는 technology 또는 protocol을 가진다.
6. “교환합니다”처럼 하나의 화살표가 양방향을 암시하는 관계가 없다.
7. L2와 L3의 내부 요소는 올바른 Software System 또는 Container boundary 안에 있다.
8. Person, Software System, Application Container, Data Store, Component가 실루엣과 명시적 타입으로 구분된다.
9. 실제 코드에 없는 Data Store가 추가되지 않는다.
10. R 번호와 별도의 관계 흐름 목록이 존재하지 않는다.

### 작업공간

11. 초기 화면은 왼쪽 패널이 열리고 Inspector가 닫힌 L1 전체 맞춤 상태다.
12. 좌우 패널은 독립적으로 열고 닫을 수 있다.
13. 패널 상태 변경 후 현재 View의 pan/zoom과 선택이 불필요하게 초기화되지 않는다.
14. 트랙패드, mouse wheel, Shift+wheel, Space+drag로 정의된 pan이 동작한다.
15. pinch, 단축키, 하단 control로 zoom과 Fit view가 동작한다.
16. zoom은 포인터 아래 world 위치를 유지하고 25%~200% 범위를 벗어나지 않는다.
17. single click은 선택, double click 또는 Open affordance는 drill-down을 수행한다.
18. breadcrumb와 Views 탭으로 모든 L1~L3 View에 이동할 수 있다.
19. L3에서 더 깊은 Code View로 이동하지 않는다.

### 시각·접근성·안정성

20. 네 개 View를 1440×900에서 전체 맞춤했을 때 node, boundary, arrow, label이 서로 알아볼 수 없게 겹치거나 잘리지 않는다.
21. 양방향 또는 병렬 관계는 별도 경로와 별도 라벨로 구분된다.
22. 오른쪽 Inspector가 열린 상태와 양쪽 패널이 닫힌 상태 모두에서 canvas가 정상적으로 재배치된다.
23. 키보드만으로 View 이동, node 선택, drill-down, panel toggle, zoom reset을 수행할 수 있다.
24. reduced motion, reduced transparency, increased contrast 환경에서 핵심 정보가 유지된다.
25. HTML은 네트워크 연결 없이 열리고 console error와 깨진 리소스 요청이 없다.
26. 기존 코드 근거와 분석 커밋 정보가 Inspector에서 확인된다.

## 테스트 전략

기존 Node 기반 테스트를 유지하고 다음 동작을 추가한다.

- model schema와 relationship 방향성 검증
- C4 level별 필수·지원 요소 검증
- `visualRole`별 SVG geometry 생성 검증
- pan/zoom transform과 scale clamp 단위 테스트
- View별 viewport 상태 보존 테스트
- panel reducer와 selection/drill-down 테스트
- R 번호와 relationship summary DOM 부재 검증
- 모든 relationship label과 technology line 렌더링 검증

브라우저 검증에서는 다음을 확인한다.

- L1, L2, iPhone L3, Watch L3의 desktop screenshot
- 왼쪽만 열린 초기 상태, 양쪽 열린 상태, 양쪽 닫힌 상태
- node 선택 후 Inspector와 inline 관계 강조
- trackpad에 해당하는 wheel delta와 mouse drag pan
- keyboard shortcuts와 focus 순서
- 1024px overlay panel 상태와 작은 화면 side sheet
- console, failed request, clipping, overlap 검사

## 비목표

- 노드와 관계를 사용자가 편집하는 기능
- 자동 레이아웃 엔진 또는 force-directed graph
- 여러 모델 파일을 불러오거나 저장하는 기능
- 협업, 댓글, 버전 비교
- Level 4 Code Diagram
- 분석 대상 Xcode 프로젝트의 코드 변경
- 실제 코드에 없는 서버, 클라우드, 데이터베이스의 추가
- 웹 배포 또는 Mac 앱 구현

Mac 앱은 향후 방향이며, 이번 작업은 동일한 정보 구조와 상호작용 문법을 검증하는 오프라인 웹 프로토타입까지를 범위로 한다.
