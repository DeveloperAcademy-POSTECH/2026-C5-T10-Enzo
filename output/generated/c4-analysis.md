# RhythmTrainer C4 Analysis

## 분석 범위

- 대상: 4
- 파일: 150
- 네트워크 없이 정적 증거만 사용

## 요소와 책임

### 리듬을 연습하는 사용자

- C4 유형: Person
- 설명: 곡을 선택하고 iPhone과 Apple Watch를 사용해 리듬을 연습합니다.
- 책임: 연습을 선택·시작하고 결과를 확인합니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### RhythmTrainer

- C4 유형: Software System
- 설명: 사용자 음원을 분석하고 손목 움직임을 바탕으로 실시간 박자 판정과 코칭을 제공합니다.
- 책임: iPhone과 Watch의 연습 흐름, 분석, 판정, 결과 저장을 소유합니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### RhythmTrainerWatch Watch App

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: Swift · watchOS
- 설명: 손목 입력을 측정하고 연습 상태와 결과를 주고받는 Watch 애플리케이션입니다.
- 책임: 손목 입력을 측정하고 연습 상태와 결과를 주고받는 Watch 애플리케이션입니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration

### Watch 프레젠테이션

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · SwiftUI
- 설명: 온보딩, 곡 선택, 연습, 결과 화면을 구성하고 사용자 동작을 전달합니다.
- 책임: 온보딩, 곡 선택, 연습, 결과 화면을 구성하고 사용자 동작을 전달합니다.
- 입력: 사용자 입력
- 입력: 사용자 행동
- 입력: 연습 화면 상태
- 입력: SessionResult
- 출력: 화면 상태와 동작 요청
- 출력: 곡 선택
- 출력: 시작·종료 명령
- 출력: 결과 표현
- 근거 요약: 18개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:15 · SwiftUI — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:8 · SwiftUI — Swift import
- 코드 근거: rhythmpractice/rhythmpractice/rhythmpracticeApp.swift:14 · ContentView — Direct initializer call
- 코드 근거: RhythmTrainer/Views/PracticeView.swift:25 · AlertBorder — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:179 · AlertBorder — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:19 · ArmSwingDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:20 · WorkoutSessionManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:21 · RhythmJudge — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:22 · WatchConnectivityManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:38 · AlertBorder — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:180 · Bool — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:184 · RoundedRectangle — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:14 · ContentView — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — Conforms to View
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:179 · AlertBorder — Conforms to View
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — Conforms to App

### 모션 캡처

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · CoreMotion
- 설명: deviceMotion에서 사용자 가속도와 시각 표본을 수집합니다.
- 책임: deviceMotion에서 사용자 가속도와 시각 표본을 수집합니다.
- 입력: 기기 모션 표본
- 입력: CMDeviceMotion 표본
- 출력: 정규화된 움직임 스트림
- 출력: 시각 + 가속도 크기
- 출력: 스윙 시각 콜백
- 근거 요약: 20개의 소스 근거와 5개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:64 · startDeviceMotionUpdates — Direct Core Motion call
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:19 · ArmSwingDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:19 · Combine — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:20 · CoreMotion — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:22 · ArmSwingDetector — class declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:8 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:25 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:28 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:30 · Int — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:32 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:39 · CMMotionManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:40 · OperationQueue — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:42 · SwingPeakDetector — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:46 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:64 · startDeviceMotionUpdates — Direct member call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:66 · handleMotion — Direct member call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:74 · stopDeviceMotionUpdates — Direct member call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:93 · process — Direct member call

### 박자 매처

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift
- 설명: 가장 가까운 정박과 스윙을 비교해 정확·빠름·느림·놓침을 계산합니다.
- 책임: 가장 가까운 정박과 스윙을 비교해 정확·빠름·느림·놓침을 계산합니다.
- 입력: beat times
- 입력: 스윙 시각
- 입력: 현재 재생 위치
- 출력: Verdict
- 출력: 마디 정확도
- 근거 요약: 10개의 소스 근거와 2개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/BeatMatcher.swift:18 · BeatMatcher — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:7 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/BeatMatcherTests.swift:5 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:38 · BeatMatcher — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:69 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:93 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/BeatMatcherTests.swift:17 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/BeatMatcherTests.swift:62 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/BeatMatcherTests.swift:96 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/BeatMatcherTests.swift:106 · BeatMatcher — Direct initializer call

### 리듬 코치

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift
- 설명: 연속 판정에 따라 이탈 경고와 정상 복귀 상태를 결정합니다.
- 책임: 연속 판정에 따라 이탈 경고와 정상 복귀 상태를 결정합니다.
- 입력: BeatMatcher 판정
- 출력: 정상 / 이탈 상태
- 근거 요약: 9개의 소스 근거와 2개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmCoach.swift:16 · RhythmCoach — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:40 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:5 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:90 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:17 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:23 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:27 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:33 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/RhythmCoachTests.swift:39 · RhythmCoach — Direct initializer call

### 리듬 판정 조정기

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine
- 설명: 카운트인, 스윙 등록, 놓침 감지와 세션 결과 생성을 조정합니다.
- 책임: 카운트인, 스윙 등록, 놓침 감지와 세션 결과 생성을 조정합니다.
- 입력: BeatGrid
- 입력: 곡 시작 시각
- 입력: 스윙 시각
- 출력: 판정 스트림
- 출력: 이탈 상태
- 출력: SessionResult
- 근거 요약: 30개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:16 · Combine — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:21 · RhythmJudge — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:18 · RhythmJudge — class declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:7 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:24 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:29 · String — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:33 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:35 · Int — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:37 · Int — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:38 · BeatMatcher — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:40 · RhythmCoach — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:42 · TimeInterval — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:44 · Timer — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:56 · Int — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:63 · Double — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:69 · BeatMatcher — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:77 · sorted — Direct member call
- 코드 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:90 · RhythmCoach — Direct initializer call

### 팔 스윙 검출기

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift
- 설명: 가속도 변화에서 팔 스윙의 기준 시각을 검출합니다.
- 책임: 가속도 변화에서 팔 스윙의 기준 시각을 검출합니다.
- 입력: 시각 + 가속도 크기
- 출력: 스윙 최저점 시각
- 근거 요약: 12개의 소스 근거와 2개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/SwingPeakDetector.swift:8 · SwingPeakDetector — struct declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:8 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:5 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:42 · SwingPeakDetector — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:46 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/SwingPeakDetector.swift:9 · Double — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/SwingPeakDetector.swift:10 · TimeInterval — Typed property dependency
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:30 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:36 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:42 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:48 · SwingPeakDetector — Direct initializer call
- 코드 근거: RhythmTrainerWatchTests/SwingPeakDetectorTests.swift:56 · SwingPeakDetector — Direct initializer call

### Watch 연결 게이트웨이

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · WatchConnectivity
- 설명: 곡 패키지, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리합니다.
- 책임: 곡 패키지, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리합니다.
- 입력: 수신 메시지
- 입력: Song + BeatGrid
- 입력: 세션 종료 신호
- 입력: 시계 오프셋 측정값
- 출력: 연습 시작 신호
- 출력: 박자 이탈 상태
- 출력: 연습 결과
- 출력: 응답 메시지
- 출력: 시계 오프셋 측정값
- 근거 요약: 20개의 소스 근거와 5개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:8 · didReceiveUserInfo — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:22 · WatchConnectivityManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:88 · replyHandler — WatchConnectivity reply callback
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:91 · replyHandler — WatchConnectivity reply callback
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:17 · Combine — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:18 · WatchConnectivity — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:20 · WatchConnectivityManager — class declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:27 · WCSession — Typed property dependency
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:31 · init — Direct member call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:58 · JSONEncoder — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:69 · JSONDecoder — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:70 · JSONDecoder — Direct initializer call

### 백그라운드 운동 런타임

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · HealthKit
- 설명: HealthKit 운동 세션으로 화면이 꺼진 동안에도 센서와 판정을 유지합니다.
- 책임: HealthKit 운동 세션으로 화면이 꺼진 동안에도 센서와 판정을 유지합니다.
- 입력: 시작 / 종료
- 입력: HealthKit 권한
- 출력: 백그라운드 운동 세션 상태
- 근거 요약: 6개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:27 · Combine — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:20 · WorkoutSessionManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:28 · HealthKit — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:36 · WorkoutSessionManager — class declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:32 · UI — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:36 · WorkoutSessionManager — Conforms to NSObject, ObservableObject

### RhythmTrainer

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: Swift · iOS
- 설명: 사용자 흐름을 조정하고 분석·재생·저장을 수행하는 iOS 애플리케이션입니다.
- 책임: 사용자 흐름을 조정하고 분석·재생·저장을 수행하는 iOS 애플리케이션입니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 코드 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration

### 프레젠테이션과 내비게이션

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftUI
- 설명: 온보딩, 곡 선택, 연습, 결과 화면을 구성하고 사용자 동작을 전달합니다.
- 책임: 온보딩, 곡 선택, 연습, 결과 화면을 구성하고 사용자 동작을 전달합니다.
- 입력: 사용자 입력
- 입력: 사용자 행동
- 입력: 연습 화면 상태
- 입력: SessionResult
- 출력: 화면 상태와 동작 요청
- 출력: 곡 선택
- 출력: 시작·종료 명령
- 출력: 결과 표현
- 근거 요약: 537개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/AppRootView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/AppShellView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/BeatPulseOverlay.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/GlassControls.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/KaraokeLyricsView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/RhythmTrainerApp.swift:8 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/AnalyzingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/HistoryView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/OnboardingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeCountdownView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeInProgressView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeResultScreen.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeView.swift:11 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/ResultLoadingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/SessionResultView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/SongLibraryView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/SongSearchView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/WatchCheckView.swift:1 · SwiftUI — Swift import

### 오디오 입출력과 재생

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftUI · AVFoundation
- 설명: 선택 음원을 PCM으로 변환하고 기준 시각에 맞춰 재생합니다.
- 책임: 선택 음원을 PCM으로 변환하고 기준 시각에 맞춰 재생합니다.
- 입력: 보안 범위 오디오 URL
- 입력: 곡 시작 기준 시각
- 출력: PCM 오디오 표본
- 출력: 재생 위치
- 근거 요약: 44개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:9 · AVFoundation — Swift import
- 코드 근거: RhythmTrainer/ViewModels/PhonePlaybackClock.swift:12 · AVFoundation — Swift import
- 코드 근거: RhythmTrainer/Models/Song.swift:15 · PhonePlaybackClock — Direct initializer call
- 코드 근거: RhythmTrainer/ViewModels/AnalyzingViewModel.swift:10 · SongUploadService — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/AppFlowViewModel.swift:51 · SongUploadService — Direct initializer call
- 코드 근거: RhythmTrainer/ViewModels/PracticeSessionViewModel.swift:30 · PhonePlaybackClock — Typed property dependency
- 코드 근거: RhythmTrainer/Views/PracticeInProgressView.swift:328 · PlaybackScrubber — Direct initializer call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:3 · PlaybackScrubber — struct declaration
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:11 · SongUploadService — struct declaration
- 코드 근거: RhythmTrainer/ViewModels/PhonePlaybackClock.swift:14 · PhonePlaybackClock — class declaration
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:4 · Double — Typed property dependency
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:18 · Capsule — Direct initializer call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:19 · opacity — Direct member call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:22 · Capsule — Direct initializer call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:27 · ForEach — Direct initializer call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:27 · Array — Direct initializer call
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:27 · enumerated — Direct member call

### 결과 점수 계산기

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift
- 설명: 세션 판정을 전체 점수와 가사 구간별 점수로 변환합니다.
- 책임: 세션 판정을 전체 점수와 가사 구간별 점수로 변환합니다.
- 입력: SessionResult
- 입력: BeatGrid
- 입력: 가사
- 출력: 전체 점수
- 출력: 가사 구간별 점수
- 근거 요약: 7개의 소스 근거와 3개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:15 · LyricScore — struct declaration
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:16 · Int — Typed property dependency
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:17 · String — Typed property dependency
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:18 · Int — Typed property dependency
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:37 · LyricScore — Direct initializer call
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:39 · LyricScore — Direct initializer call
- 코드 근거: RhythmTrainer/Models/LyricScoring.swift:15 · LyricScore — Conforms to Equatable, Identifiable

### 영속성 저장소

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftData
- 설명: 연습 세션과 BeatGrid 캐시를 읽고 저장합니다.
- 책임: 연습 세션과 BeatGrid 캐시를 읽고 저장합니다.
- 입력: PracticeSession
- 입력: BeatGrid
- 출력: 저장된 세션
- 출력: 캐시된 BeatGrid
- 근거 요약: 13개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:9 · SwiftData — Swift import
- 코드 근거: RhythmTrainer/ViewModels/AnalyzingViewModel.swift:12 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/HistoryViewModel.swift:17 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/ResultViewModel .swift:26 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/SongHistoryViewModel.swift:31 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:37 · CachedBeatGrid — class declaration
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:54 · PracticeSessionStore — struct declaration
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:38 · UUID — Typed property dependency
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:38 · Attribute — Direct initializer call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:41 · BeatGrid — Typed property dependency
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:44 · Date — Typed property dependency
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 · CachedBeatGrid — Direct initializer call
- 코드 근거: RhythmTrainer/ViewModels/HistoryViewModel.swift:26 · PracticeSessionStore — Typed property dependency

### 박자 분석 어댑터

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · ONNX Runtime
- 설명: PCM 오디오를 네이티브 분석기로 전달하고 결과를 BeatGrid로 변환합니다.
- 책임: PCM 오디오를 네이티브 분석기로 전달하고 결과를 BeatGrid로 변환합니다.
- 입력: PCM 오디오 표본
- 출력: 박자 위치와 BPM
- 근거 요약: 21개의 소스 근거와 2개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:3 · BeatAnalysisService — struct declaration
- 코드 근거: RhythmTrainer/Models/Song.swift:15 · BeatAnalysisService — Direct initializer call
- 코드 근거: RhythmTrainer/ViewModels/AnalyzingViewModel.swift:11 · BeatAnalysisService — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/AppFlowViewModel.swift:52 · BeatAnalysisService — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:4 · BeatThisBridge — Typed property dependency
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:7 · url — Direct member call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:14 · BeatThisBridge — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:20 · NSArray — Typed property dependency
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:21 · NSArray — Typed property dependency
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:31 · BeatGrid — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:40 · detectBeats — Direct member call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:49 · NSArray — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:56 · firstIndex — Direct member call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:64 · Double — Typed property dependency
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:67 · Double — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:72 · BeatGrid — Direct initializer call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:101 · append — Direct member call
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:111 · append — Direct member call

### 연습 흐름 코디네이터

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftUI
- 설명: 분석→Watch 준비→연습→종료→결과의 상태 전이를 조정합니다.
- 책임: 분석→Watch 준비→연습→종료→결과의 상태 전이를 조정합니다.
- 입력: 사용자 입력
- 입력: 선택한 곡
- 입력: Watch 세션 메시지
- 출력: 화면 상태와 동작 요청
- 출력: 화면 상태
- 출력: 분석·재생·통신 명령
- 근거 요약: 73개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:11 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeJourneyView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/AppShellView.swift:29 · PracticeJourneyView — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:13 · AppFlowRootView — struct declaration
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:137 · ResultScreen — struct declaration
- 코드 근거: RhythmTrainer/Views/PracticeJourneyView.swift:5 · PracticeJourneyView — struct declaration
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:7 · AppFlowViewModel — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:14 · AppFlowViewModel — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:19 · ignoresSafeArea — Direct member call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:36 · ResultScreen — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:41 · CenteredMessage — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:48 · CenteredMessage — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:51 · selectSong — Direct member call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:55 · LoadingMessage — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:59 · CenteredMessage — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:67 · PracticeInProgressView — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:68 · PracticeInProgressView — Direct initializer call
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:69 · SongViewData — Direct initializer call

### Phone 연결 게이트웨이

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · WatchConnectivity
- 설명: 곡 패키지, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리합니다.
- 책임: 곡 패키지, 시계 동기화, 시작·이탈·종료·결과 메시지를 처리합니다.
- 입력: Song + BeatGrid
- 입력: 박자 이탈 상태 + 연습 시작 신호
- 입력: 연습 결과
- 출력: Song + BeatGrid
- 출력: 세션 종료 신호
- 출력: 시계 오프셋 측정값
- 근거 요약: 27개의 소스 근거와 5개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:50 · didReceiveUserInfo — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainer/ViewModels/AppFlowViewModel.swift:30 · PhoneConnectivityManager — Direct initializer call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:9 · WatchConnectivity — Swift import
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:11 · PhoneConnectivityManager — class declaration
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:22 · WCSession — Typed property dependency
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:28 · init — Direct member call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:29 · init — Direct member call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:44 · JSONEncoder — Direct initializer call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:45 · JSONEncoder — Direct initializer call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:46 · Data — Direct initializer call
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:70 · Timer — Typed property dependency
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:74 · TimeInterval — Typed property dependency
- 코드 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:78 · prefix — Direct member call

### BeatThis 네이티브 엔진

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Objective-C++ · ONNX Runtime
- 설명: 멜 스펙트로그램, ONNX 추론과 후처리로 박자 위치와 템포를 추출합니다.
- 책임: 멜 스펙트로그램, ONNX 추론과 후처리로 박자 위치와 템포를 추출합니다.
- 입력: PCM 오디오 표본
- 출력: 박자 위치와 BPM
- 근거 요약: 473개의 소스 근거와 4개의 경계 신호로 식별했습니다.
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Bridging-Header/BeatThisBridge.h:5 · BeatThisBridge — Objective-C interface boundary
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/beat_this_api.cpp:20 · BeatThis — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/beat_this_api.h:16 · BeatThis — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/DBNPostprocessor.h:8 · BarStateSpace — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/InferenceProcessor.h:9 · InferenceProcessor — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/MelSpectrogram.h:12 · MelSpectrogram — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Source/Postprocessor.h:10 · Postprocessor — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/PocketFFT/pocketfft_hdronly.h:139 · VLEN — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPBlockConvolver.h:35 · also — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPFIRFilter.h:50 · for — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPFracInterpolator.h:38 · CDSPFracDelayFilterBank — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPHBDownsampler.h:30 · CDSPHBDownsampler — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPHBUpsampler.h:31 · CDSPHBUpsampler — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPProcessor.h:7 · for — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPRealFFT.h:38 · can — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPResampler.h:9 · that — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/CDSPSincFilterGen.h:9 · implementation — C++ type declaration
- 코드 근거: RhythmTrainer/Services/Library/BeatThis_Submodule/r8brain/fft/fft4g.h:7 · for — C++ type declaration

### 사용자 파일 저장소

- C4 유형: Software System
- 설명: Files 또는 iCloud Drive에 있는 사용자가 선택한 음원의 보안 범위 URL을 제공합니다.
- 책임: 사용자가 소유한 오디오 파일을 보관하고 선택된 파일 URL을 제공합니다.
- 입력: 사용자가 보관한 오디오 파일
- 출력: 보안 범위 오디오 URL
- 근거 요약: 3개의 보안 범위 파일 접근 근거로 식별했습니다.
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 연습 데이터 저장소

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: SwiftData ModelContext
- 설명: 연습 세션, 판정 결과, 사용자 진행 상태를 기기에 저장합니다.
- 책임: 애플리케이션이 소유한 연습 데이터를 영속화합니다.
- 입력: 저장할 연습 데이터
- 출력: 조회된 연습 데이터
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:69 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:79 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:82 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:117 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:149 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 — Direct persistence write call
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:155 — Direct persistence write call

## 관계와 데이터 흐름

### 리듬을 연습하는 사용자 → RhythmTrainer

- 동작: 곡을 선택하고 리듬 연습과 결과 확인을 수행합니다.
- 목적: 리듬 연습
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### 리듬을 연습하는 사용자 → RhythmTrainerWatch Watch App

- API / 프로토콜: Apple Watch UI
- 동작: 손목에서 연습을 시작하고 피드백을 확인합니다.
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 송신 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration

### 리듬을 연습하는 사용자 → Watch 프레젠테이션

- API / 프로토콜: watchOS UI
- 동작: 화면에서 연습 흐름을 조작합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — struct declaration
- 수신 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — struct declaration

### 리듬을 연습하는 사용자 → RhythmTrainer

- API / 프로토콜: iPhone UI
- 동작: 곡을 선택하고 연습 흐름을 조작합니다.
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 송신 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration

### 리듬을 연습하는 사용자 → 프레젠테이션과 내비게이션

- API / 프로토콜: SwiftUI
- 동작: 화면에서 연습 흐름을 조작합니다.
- 송신 근거: RhythmTrainer/AppRootView.swift:3 · AppRootView — struct declaration
- 수신 근거: RhythmTrainer/AppRootView.swift:3 · AppRootView — struct declaration

### 리듬을 연습하는 사용자 → 연습 흐름 코디네이터

- API / 프로토콜: SwiftUI
- 동작: 화면에서 연습 흐름을 조작합니다.
- 송신 근거: RhythmTrainer/Views/AppFlowRootView.swift:13 · AppFlowRootView — struct declaration
- 수신 근거: RhythmTrainer/Views/AppFlowRootView.swift:13 · AppFlowRootView — struct declaration

### Watch 프레젠테이션 → 모션 캡처

- API / 프로토콜: Swift protocol · ArmSwingDetector
- 동작: ArmSwingDetector 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:19 · ArmSwingDetector — Direct initializer call

### Watch 프레젠테이션 → 백그라운드 운동 런타임

- API / 프로토콜: Swift protocol · WorkoutSessionManager
- 동작: WorkoutSessionManager 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:20 · WorkoutSessionManager — Direct initializer call

### Watch 프레젠테이션 → 리듬 판정 조정기

- API / 프로토콜: Swift protocol · RhythmJudge
- 동작: RhythmJudge 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:21 · RhythmJudge — Direct initializer call

### Watch 프레젠테이션 → Watch 연결 게이트웨이

- API / 프로토콜: Swift protocol · WatchConnectivityManager
- 동작: WatchConnectivityManager 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:22 · WatchConnectivityManager — Direct initializer call

### 모션 캡처 → 팔 스윙 검출기

- API / 프로토콜: Swift protocol · SwingPeakDetector
- 동작: SwingPeakDetector 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/Services/ArmSwingDetector.swift:42 · SwingPeakDetector — Typed property dependency

### 리듬 판정 조정기 → 박자 매처

- API / 프로토콜: Swift protocol · BeatMatcher
- 동작: BeatMatcher 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:38 · BeatMatcher — Typed property dependency

### 리듬 판정 조정기 → 리듬 코치

- API / 프로토콜: Swift protocol · RhythmCoach
- 동작: RhythmCoach 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/Services/RhythmJudge.swift:40 · RhythmCoach — Direct initializer call

### 프레젠테이션과 내비게이션 → 연습 흐름 코디네이터

- API / 프로토콜: Swift protocol · PracticeJourneyView
- 동작: PracticeJourneyView 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainer/AppShellView.swift:29 · PracticeJourneyView — Direct initializer call

### 박자 분석 어댑터 → BeatThis 네이티브 엔진

- API / 프로토콜: Swift protocol · BeatThisBridge
- 동작: BeatThisBridge 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainer/Services/BeatAnalysisService.swift:4 · BeatThisBridge — Typed property dependency
- 수신 근거: Library/BeatThis_Bridging-Header/BeatThisBridge.h:5 · BeatThisBridge — Objective-C interface boundary
- 수신 근거: RhythmTrainer/Services/Library/BeatThis_Bridging-Header/BeatThisBridge.h:5 · BeatThisBridge — Objective-C interface boundary

### 연습 흐름 코디네이터 → 프레젠테이션과 내비게이션

- API / 프로토콜: Swift protocol · PracticeInProgressView
- 동작: PracticeInProgressView 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainer/Views/AppFlowRootView.swift:67 · PracticeInProgressView — Direct initializer call

### 프레젠테이션과 내비게이션 → 오디오 입출력과 재생

- API / 프로토콜: Swift protocol · PlaybackScrubber
- 동작: PlaybackScrubber 책임에 동작을 위임합니다.
- 송신 근거: RhythmTrainer/Views/PracticeInProgressView.swift:328 · PlaybackScrubber — Direct initializer call

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Song + BeatGrid 패키지를 전송합니다.
- 목적: Song + BeatGrid 패키지를 전송합니다.
- 데이터: Song + BeatGrid
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### Phone 연결 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Song + BeatGrid 패키지를 전송합니다.
- 목적: Song + BeatGrid 패키지를 전송합니다.
- 데이터: Song + BeatGrid
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → Watch 연결 게이트웨이

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Song + BeatGrid 패키지를 전송합니다.
- 목적: Song + BeatGrid 패키지를 전송합니다.
- 데이터: Song + BeatGrid
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: 세션 종료 신호를 전송합니다.
- 목적: 세션 종료 신호를 전송합니다.
- 데이터: 세션 종료 신호
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### Phone 연결 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: 세션 종료 신호를 전송합니다.
- 목적: 세션 종료 신호를 전송합니다.
- 데이터: 세션 종료 신호
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → Watch 연결 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: 세션 종료 신호를 전송합니다.
- 목적: 세션 종료 신호를 전송합니다.
- 데이터: 세션 종료 신호
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: 시계 오프셋 측정값을 요청합니다.
- 목적: 시계 오프셋 측정값을 요청합니다.
- 데이터: 시계 오프셋 측정값
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### Phone 연결 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: 시계 오프셋 측정값을 요청합니다.
- 목적: 시계 오프셋 측정값을 요청합니다.
- 데이터: 시계 오프셋 측정값
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → Watch 연결 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: 시계 오프셋 측정값을 요청합니다.
- 목적: 시계 오프셋 측정값을 요청합니다.
- 데이터: 시계 오프셋 측정값
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: 연습 시작 신호를 전송합니다.
- 목적: 연습 시작 신호를 전송합니다.
- 데이터: 연습 시작 신호
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### Watch 연결 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: 연습 시작 신호를 전송합니다.
- 목적: 연습 시작 신호를 전송합니다.
- 데이터: 연습 시작 신호
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → Phone 연결 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: 연습 시작 신호를 전송합니다.
- 목적: 연습 시작 신호를 전송합니다.
- 데이터: 연습 시작 신호
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: 박자 이탈 상태를 전송합니다.
- 목적: 박자 이탈 상태를 전송합니다.
- 데이터: 박자 이탈 상태
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### Watch 연결 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: 박자 이탈 상태를 전송합니다.
- 목적: 박자 이탈 상태를 전송합니다.
- 데이터: 박자 이탈 상태
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → Phone 연결 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: 박자 이탈 상태를 전송합니다.
- 목적: 박자 이탈 상태를 전송합니다.
- 데이터: 박자 이탈 상태
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · transferUserInfo
- 동작: 연습 결과를 전송합니다.
- 목적: 연습 결과를 전송합니다.
- 데이터: 연습 결과
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### Watch 연결 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · transferUserInfo
- 동작: 연습 결과를 전송합니다.
- 목적: 연습 결과를 전송합니다.
- 데이터: 연습 결과
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → Phone 연결 게이트웨이

- API / 프로토콜: WCSession · transferUserInfo
- 동작: 연습 결과를 전송합니다.
- 목적: 연습 결과를 전송합니다.
- 데이터: 연습 결과
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → 사용자 파일 저장소

- 동작: 분석할 사용자 음원에 접근합니다.
- 목적: 사용자 음원 읽기
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 사용자 파일 저장소 → RhythmTrainer

- API / 프로토콜: Security-scoped URL · AVFoundation
- 동작: 선택한 음원의 보안 범위 URL을 제공합니다.
- 목적: 선택 음원 제공
- 데이터: 오디오 URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 사용자 파일 저장소 → 오디오 입출력과 재생

- API / 프로토콜: Security-scoped URL · AVFoundation
- 동작: 선택한 음원을 디코딩과 재생을 위해 제공합니다.
- 목적: 오디오 파일 읽기
- 데이터: 오디오 URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### RhythmTrainer → 연습 데이터 저장소

- API / 프로토콜: SwiftData ModelContext
- 동작: 연습 결과와 진행 상태를 저장합니다.
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:69 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:79 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:82 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:117 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:149 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:155 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:69 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:79 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:82 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:117 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:149 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:155 — Direct persistence write call

### 영속성 저장소 → 연습 데이터 저장소

- API / 프로토콜: SwiftData ModelContext
- 동작: 연습 결과와 진행 상태를 저장합니다.
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:69 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:79 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:82 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:117 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:149 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 — Direct persistence write call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:155 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:69 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:79 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:82 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:117 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:149 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:151 — Direct persistence write call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:155 — Direct persistence write call

### 연습 데이터 저장소 → RhythmTrainer

- API / 프로토콜: SwiftData ModelContext
- 동작: 저장된 연습 기록을 조회합니다.
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call

### 연습 데이터 저장소 → 영속성 저장소

- API / 프로토콜: SwiftData ModelContext
- 동작: 저장된 연습 기록을 조회합니다.
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call

## 경고와 불확실성

- 없음

## 자동 정규화

- [element-technology-removed] user-file-store
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-3
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-연습-기록을-조회합니다-2
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-연습-기록을-조회합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-4
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-4
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-연습-기록을-조회합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-연습-기록을-조회합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-연습-기록을-조회합니다-4
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-연습-기록을-조회합니다-4
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-5
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-5
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-6
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-6
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-7
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-연습-결과와-진행-상태를-저장합니다-7

## 모델 검토 항목

- 없음
