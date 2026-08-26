# RhythmTrainer C4 Analysis

## 분석 범위

- 대상: 4
- 파일: 150
- 네트워크 없이 정적 증거만 사용

## 요소와 책임

### 애플리케이션 사용자

- C4 유형: Person
- 설명: RhythmTrainer의 소스에서 확인된 진입점을 사용합니다.
- 책임: 확인된 사용자 진입점을 통해 애플리케이션을 사용합니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### RhythmTrainer

- C4 유형: Software System
- 설명: RhythmTrainer Xcode 프로젝트에 선언된 애플리케이션 실행 경계를 나타냅니다.
- 책임: Xcode 대상에 선언된 실행 경계를 소유합니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### RhythmTrainerWatch Watch App

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: Swift · watchOS
- 설명: Xcode 대상 메타데이터에서 확인된 watchOS 실행 경계입니다.
- 책임: Xcode 대상 메타데이터에서 확인된 watchOS 실행 경계입니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration

### 프레젠테이션 경계

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · SwiftUI
- 설명: 소스에서 확인된 ContentView, AlertBorder, RhythmTrainerWatch_Watch_AppApp 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 ContentView, AlertBorder, RhythmTrainerWatch_Watch_AppApp 동작을 하나의 책임 경계로 묶습니다.
- 입력: 사용자 입력
- 입력: ContentView 호출
- 입력: Phase 호출
- 입력: AlertBorder 호출
- 입력: RhythmTrainerWatch_Watch_AppApp 호출
- 출력: 화면 상태와 동작 요청
- 출력: ArmSwingDetector 위임
- 출력: WorkoutSessionManager 위임
- 출력: RhythmJudge 위임
- 출력: WatchConnectivityManager 위임
- 출력: AlertBorder 위임
- 출력: Bool 위임
- 출력: RoundedRectangle 위임
- 출력: ContentView 위임
- 근거 요약: 16개의 소스 위치와 4개의 경계 신호에서 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:15 · SwiftUI — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:8 · SwiftUI — Swift import
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

### 센서 입력 경계

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · CoreMotion
- 설명: 소스에서 확인된 ArmSwingDetector 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 ArmSwingDetector 동작을 하나의 책임 경계로 묶습니다.
- 입력: 기기 센서 표본
- 입력: ContentView 호출
- 입력: ArmSwingDetector 호출
- 출력: 정규화된 센서 스트림
- 출력: ArmSwingDetector 위임
- 출력: SwingPeakDetector 위임
- 출력: Double 위임
- 출력: Int 위임
- 출력: CMMotionManager 위임
- 출력: OperationQueue 위임
- 근거 요약: 20개의 소스 위치와 5개의 경계 신호에서 식별했습니다.
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

### 메시징 게이트웨이

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · WatchConnectivity
- 설명: 소스에서 확인된 WatchConnectivityManager 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 WatchConnectivityManager 동작을 하나의 책임 경계로 묶습니다.
- 입력: 수신 메시지
- 입력: Grid + Song + Song Package
- 입력: Session Stop
- 입력: Ping T2 + Ping T3 + Sync Ping
- 입력: ContentView 호출
- 입력: WatchConnectivityManager 호출
- 출력: Session Start + Song Start Watch
- 출력: Alert State
- 출력: Session Result
- 출력: 응답 메시지
- 출력: Ping T2 + Ping T3
- 출력: WatchConnectivityManager 위임
- 출력: WCSession 위임
- 출력: JSONEncoder 위임
- 출력: JSONDecoder 위임
- 출력: WCSessionDelegate 위임
- 근거 요약: 20개의 소스 위치와 5개의 경계 신호에서 식별했습니다.
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

### 애플리케이션 서비스 경계

- C4 유형: Component · 상위 경계: RhythmTrainerWatch Watch App
- 기술: Swift · Combine · HealthKit
- 설명: 소스에서 확인된 WorkoutSessionManager 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 WorkoutSessionManager 동작을 하나의 책임 경계로 묶습니다.
- 입력: ContentView 호출
- 출력: WorkoutSessionManager 위임
- 출력: UI 위임
- 근거 요약: 6개의 소스 위치와 4개의 경계 신호에서 식별했습니다.
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:27 · Combine — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/ContentView.swift:20 · WorkoutSessionManager — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:28 · HealthKit — Swift import
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:36 · WorkoutSessionManager — class declaration
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:32 · UI — Direct initializer call
- 코드 근거: RhythmTrainerWatch Watch App/Services/WorkoutSessionManager.swift:36 · WorkoutSessionManager — Conforms to NSObject, ObservableObject

### RhythmTrainer

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: Swift · iOS
- 설명: Xcode 대상 메타데이터에서 확인된 iOS 실행 경계입니다.
- 책임: Xcode 대상 메타데이터에서 확인된 iOS 실행 경계입니다.
- 코드 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 코드 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration

### 프레젠테이션 경계

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftUI
- 설명: 소스에서 확인된 AppRootView, AppShellView, BeatPulseOverlay, NaturalEdgeGradient 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 AppRootView, AppShellView, BeatPulseOverlay, NaturalEdgeGradient 동작을 하나의 책임 경계로 묶습니다.
- 입력: 사용자 입력
- 입력: AppRootView 호출
- 입력: AppShellView 호출
- 입력: BeatPulseOverlay 호출
- 입력: NaturalEdgeGradient 호출
- 입력: BrandPrimaryButton 호출
- 입력: BrandSecondaryButton 호출
- 입력: SearchGlassBar 호출
- 입력: KaraokeLyricsView 호출
- 입력: LyricViewData 호출
- 입력: KaraokeLyricLine 호출
- 입력: LyricsScrollEdge 호출
- 입력: PlaybackScrubber 호출
- 입력: LyricLine 호출
- 입력: SongViewData 호출
- 입력: RhythmTrainerApp 호출
- 입력: AnalyzingView 호출
- 입력: AppFlowRootView 호출
- 입력: ResultScreen 호출
- 입력: HistoryView 호출
- 입력: HistorySongHeader 호출
- 입력: OnboardingView 호출
- 입력: PracticeCountdownView 호출
- 입력: Mode 호출
- 입력: PracticeInProgressSimulatedBody 호출
- 입력: PracticeInProgressLiveBody 호출
- 입력: PracticeInProgressChrome 호출
- 입력: PracticeCountInOverlay 호출
- 입력: PracticeOffBeatAlertOverlay 호출
- 입력: PracticeSongHeader 호출
- 입력: PracticeTransportControls 호출
- 입력: PracticeGlassGradientSurface 호출
- 입력: PracticeGlassGradient 호출
- 입력: PracticeJourneyView 호출
- 입력: PracticeResultScreen 호출
- 입력: PracticeView 호출
- 입력: AlertBorder 호출
- 입력: ResultLoadingView 호출
- 입력: SessionResultView 호출
- 입력: ScoreSummaryCard 호출
- 입력: ScoreLine 호출
- 입력: PhraseScoresCard 호출
- 입력: SongLibraryView 호출
- 입력: SongSearchView 호출
- 입력: SongSearchSuggestions 호출
- 입력: SongSearchResults 호출
- 입력: SongSearchRow 호출
- 입력: WatchCheckView 호출
- 출력: 화면 상태와 동작 요청
- 출력: RootPhase 위임
- 출력: OnboardingView 위임
- 출력: AppShellView 위임
- 출력: AppTab 위임
- 출력: SongViewData 위임
- 출력: TabView 위임
- 출력: Tab 위임
- 출력: SongLibraryView 위임
- 출력: HistoryView 위임
- 출력: SongSearchView 위임
- 출력: PracticeJourneyView 위임
- 출력: Environment 위임
- 출력: Bool 위임
- 출력: CGFloat 위임
- 출력: NaturalEdgeGradient 위임
- 출력: Canvas 위임
- 출력: CGRect 위임
- 출력: Path 위임
- 출력: CGSize 위임
- 출력: Double 위임
- 출력: String 위임
- 출력: Button 위임
- 출력: GlassEffectContainer 위임
- 출력: HStack 위임
- 출력: Image 위임
- 출력: TextField 위임
- 출력: SearchFieldSurface 위임
- 출력: SearchDoneButtonStyle 위임
- 출력: TimeInterval 위임
- 출력: Int 위임
- 출력: LazyVStack 위임
- 출력: Spacer 위임
- 출력: ForEach 위임
- 출력: Array 위임
- 출력: KaraokeLyricLine 위임
- 출력: LyricsScrollEdge 위임
- 출력: KaraokeLyricState 위임
- 출력: Text 위임
- 출력: Font 위임
- 출력: Color 위임
- 출력: LyricsScrollEdgePosition 위임
- 출력: Rectangle 위임
- 출력: LyricsScrollEdgeSurface 위임
- 출력: LinearGradient 위임
- 출력: Capsule 위임
- 출력: Circle 위임
- 출력: DragGesture 위임
- 출력: LyricViewData 위임
- 출력: AppRootView 위임
- 출력: VStack 위임
- 출력: ProgressView 위임
- 출력: AppFlowViewModel 위임
- 출력: ResultScreen 위임
- 출력: CenteredMessage 위임
- 출력: LoadingMessage 위임
- 출력: PracticeInProgressView 위임
- 출력: ResultLoadingView 위임
- 출력: PracticeSession 위임
- 출력: BeatGrid 위임
- 출력: Divider 위임
- 출력: StrokeStyle 위임
- 출력: HistorySongHeader 위임
- 출력: SessionResultView 위임
- 출력: BrandPrimaryButton 위임
- 출력: PracticeInProgressSimulatedBody 위임
- 출력: PracticeInProgressLiveBody 위임
- 출력: State 위임
- 출력: PracticeInProgressChrome 위임
- 출력: BeatPulseOverlay 위임
- 출력: Live 위임
- 출력: PracticeSessionViewModel 위임
- 출력: Binding 위임
- 출력: PracticeOffBeatAlertOverlay 위임
- 출력: PracticeCountInOverlay 위임
- 출력: PracticeSongHeader 위임
- 출력: KaraokeLyricsView 위임
- 출력: PracticeTransportControls 위임
- 출력: RoundedRectangle 위임
- 출력: PracticeGlassGradientSurface 위임
- 출력: PlaybackScrubber 위임
- 출력: Label 위임
- 출력: PracticeGlassGradient 위임
- 출력: PracticeGlassGradientStyle 위임
- 출력: PracticeGlassEffect 위임
- 출력: AnalyzingView 위임
- 출력: WatchCheckView 위임
- 출력: PracticeResultScreen 위임
- 출력: DateFormatter 위임
- 출력: Locale 위임
- 출력: SessionResultViewState 위임
- 출력: PhraseScoreViewState 위임
- 출력: ZStack 위임
- 출력: BrandSecondaryButton 위임
- 출력: AlertBorder 위임
- 출력: ScoreSummaryCard 위임
- 출력: PhraseScoresCard 위임
- 출력: ScoreLine 위임
- 출력: ScrollView 위임
- 출력: LazyHStack 위임
- 출력: SearchGlassBar 위임
- 출력: SongSearchResults 위임
- 출력: SongSearchSuggestions 위임
- 출력: List 위임
- 출력: SongSearchRow 위임
- 출력: EdgeInsets 위임
- 근거 요약: 608개의 소스 위치와 4개의 경계 신호에서 식별했습니다.
- 코드 근거: RhythmTrainer/AppRootView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/AppShellView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/BeatPulseOverlay.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/GlassControls.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/KaraokeLyricsView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Components/PlaybackScrubber.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/RhythmTrainerApp.swift:8 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/AnalyzingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/AppFlowRootView.swift:11 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/HistoryView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/OnboardingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeCountdownView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeInProgressView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeJourneyView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeResultScreen.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/PracticeView.swift:11 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/ResultLoadingView.swift:1 · SwiftUI — Swift import
- 코드 근거: RhythmTrainer/Views/SessionResultView.swift:1 · SwiftUI — Swift import

### 영속성 경계

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · SwiftData
- 설명: 소스에서 확인된 PracticeSessionStore 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 PracticeSessionStore 동작을 하나의 책임 경계로 묶습니다.
- 입력: AnalyzingViewModel 호출
- 입력: HistoryViewModel 호출
- 입력: ResultViewModel 호출
- 입력: SongHistoryViewModel 호출
- 출력: PracticeSessionStore 위임
- 근거 요약: 7개의 소스 위치와 3개의 경계 신호에서 식별했습니다.
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:9 · SwiftData — Swift import
- 코드 근거: RhythmTrainer/ViewModels/AnalyzingViewModel.swift:12 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/HistoryViewModel.swift:17 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/ResultViewModel .swift:26 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/SongHistoryViewModel.swift:31 · PracticeSessionStore — Typed property dependency
- 코드 근거: RhythmTrainer/Models/PracticeSessionStore.swift:54 · PracticeSessionStore — struct declaration
- 코드 근거: RhythmTrainer/ViewModels/HistoryViewModel.swift:26 · PracticeSessionStore — Typed property dependency

### 애플리케이션 서비스 경계

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · AVFoundation
- 설명: 소스에서 확인된 BeatAnalysisService, SongUploadService 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 BeatAnalysisService, SongUploadService 동작을 하나의 책임 경계로 묶습니다.
- 입력: Song 호출
- 입력: BeatAnalysisService 호출
- 입력: AnalyzingViewModel 호출
- 입력: Screen 호출
- 출력: BeatAnalysisService 위임
- 출력: BeatThisBridge 위임
- 출력: NSArray 위임
- 출력: BeatGrid 위임
- 출력: Double 위임
- 출력: Dictionary 위임
- 출력: SongUploadService 위임
- 근거 요약: 25개의 소스 위치와 4개의 경계 신호에서 식별했습니다.
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:9 · AVFoundation — Swift import
- 코드 근거: RhythmTrainer/Services/BeatAnalysisService.swift:3 · BeatAnalysisService — struct declaration
- 코드 근거: RhythmTrainer/Models/Song.swift:15 · BeatAnalysisService — Direct initializer call
- 코드 근거: RhythmTrainer/ViewModels/AnalyzingViewModel.swift:10 · SongUploadService — Typed property dependency
- 코드 근거: RhythmTrainer/ViewModels/AppFlowViewModel.swift:51 · SongUploadService — Direct initializer call
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:11 · SongUploadService — struct declaration
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

### 메시징 게이트웨이

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Swift · WatchConnectivity
- 설명: 소스에서 확인된 PhoneConnectivityManager 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 PhoneConnectivityManager 동작을 하나의 책임 경계로 묶습니다.
- 입력: Grid + Song + Song Package
- 입력: Alert State + Session Start + Song Start Watch
- 입력: Session Result
- 입력: Screen 호출
- 입력: PhoneConnectivityManager 호출
- 출력: Grid + Song + Song Package
- 출력: Session Stop
- 출력: Ping T2 + Ping T3 + Sync Ping
- 출력: PhoneConnectivityManager 위임
- 출력: WCSession 위임
- 출력: JSONEncoder 위임
- 출력: Data 위임
- 출력: Timer 위임
- 출력: TimeInterval 위임
- 출력: JSONDecoder 위임
- 근거 요약: 27개의 소스 위치와 5개의 경계 신호에서 식별했습니다.
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

### 네이티브 통합 경계

- C4 유형: Component · 상위 경계: RhythmTrainer
- 기술: Objective-C++
- 설명: 소스에서 확인된 BeatThisBridge, BeatThis, BeatThis, Impl 동작을 하나의 책임 경계로 묶습니다.
- 책임: 소스에서 확인된 BeatThisBridge, BeatThis, BeatThis, Impl 동작을 하나의 책임 경계로 묶습니다.
- 입력: BeatAnalysisService 호출
- 입력: BeatThisBridge 호출
- 입력: BeatThis 호출
- 입력: sincos_2pibyn 호출
- 입력: util 호출
- 입력: latch 호출
- 입력: concurrent_queue 호출
- 입력: alignas 호출
- 입력: fctdata 호출
- 입력: fftblue 호출
- 입력: pocketfft_c 호출
- 입력: pocketfft_r 호출
- 입력: T_dct1 호출
- 입력: T_dst1 호출
- 입력: T_dcst23 호출
- 입력: T_dcst4 호출
- 입력: arr_info 호출
- 입력: multi_iter 호출
- 입력: simple_iter 호출
- 입력: rev_iter 호출
- 입력: VTYPE 호출
- 입력: add_vec 호출
- 입력: ExecC2C 호출
- 입력: ExecHartley 호출
- 입력: ExecDcst 호출
- 입력: ExecR2R 호출
- 입력: CDSPBlockConvolver 호출
- 입력: CDSPFIRFilterCache 호출
- 입력: CDSPFIRFilter 호출
- 입력: CDSPFracDelayFilterBankCache 호출
- 입력: CDSPFracDelayFilterBank 호출
- 입력: CDSPFracInterpolator 호출
- 입력: CDSPRealFFTKeeper 호출
- 입력: CDSPResampler 호출
- 입력: CDSPSincFilterGen 호출
- 출력: BeatThisBridge 위임
- 근거 요약: 473개의 소스 위치와 4개의 경계 신호에서 식별했습니다.
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

### 외부 파일 저장소

- C4 유형: Software System
- 설명: 직접 확인된 보안 범위 URL을 통해 사용자가 선택한 파일을 제공합니다.
- 책임: 사용자가 소유한 파일과 선택된 URL을 제공합니다.
- 입력: 사용자 소유 파일
- 출력: 보안 범위 파일 URL
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 코드 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 애플리케이션 데이터 저장소

- C4 유형: Container · 상위 경계: RhythmTrainer
- 기술: SwiftData ModelContext
- 설명: 직접 확인된 읽기와 쓰기로 애플리케이션 소유 데이터를 저장합니다.
- 책임: 애플리케이션 소유 데이터를 영속화합니다.
- 입력: 저장할 애플리케이션 데이터
- 출력: 조회된 애플리케이션 데이터
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

### 애플리케이션 사용자 → RhythmTrainer

- 동작: 애플리케이션을 사용합니다.
- 목적: 사용자 진입
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership

### 애플리케이션 사용자 → RhythmTrainerWatch Watch App

- API / 프로토콜: watchOS UI
- 동작: RhythmTrainerWatch Watch App의 확인된 사용자 인터페이스를 사용합니다.
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 송신 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainerWatch Watch App/RhythmTrainerWatchApp.swift:11 · RhythmTrainerWatch_Watch_AppApp — struct declaration

### 애플리케이션 사용자 → 프레젠테이션 경계

- API / 프로토콜: watchOS UI
- 동작: 확인된 화면 경계를 통해 애플리케이션 동작을 요청합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — struct declaration
- 수신 근거: RhythmTrainerWatch Watch App/ContentView.swift:18 · ContentView — struct declaration

### 애플리케이션 사용자 → RhythmTrainer

- API / 프로토콜: iOS UI
- 동작: RhythmTrainer의 확인된 사용자 인터페이스를 사용합니다.
- 송신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 송신 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration
- 수신 근거: RhythmTrainer.xcodeproj/project.pbxproj — PBXNativeTarget and build phase membership
- 수신 근거: RhythmTrainer/RhythmTrainerApp.swift:11 · RhythmTrainerApp — struct declaration

### 애플리케이션 사용자 → 프레젠테이션 경계

- API / 프로토콜: iOS UI
- 동작: 확인된 화면 경계를 통해 애플리케이션 동작을 요청합니다.
- 송신 근거: RhythmTrainer/AppRootView.swift:3 · AppRootView — struct declaration
- 수신 근거: RhythmTrainer/AppRootView.swift:3 · AppRootView — struct declaration

### 프레젠테이션 경계 → 센서 입력 경계

- API / 프로토콜: Swift protocol · ArmSwingDetector
- 동작: ArmSwingDetector 경계에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:19 · ArmSwingDetector — Direct initializer call

### 프레젠테이션 경계 → 애플리케이션 서비스 경계

- API / 프로토콜: Swift protocol · WorkoutSessionManager
- 동작: WorkoutSessionManager 경계에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:20 · WorkoutSessionManager — Direct initializer call

### 프레젠테이션 경계 → 메시징 게이트웨이

- API / 프로토콜: Swift protocol · WatchConnectivityManager
- 동작: WatchConnectivityManager 경계에 동작을 위임합니다.
- 송신 근거: RhythmTrainerWatch Watch App/ContentView.swift:22 · WatchConnectivityManager — Direct initializer call

### 애플리케이션 서비스 경계 → 네이티브 통합 경계

- API / 프로토콜: Swift protocol · BeatThisBridge
- 동작: BeatThisBridge 경계에 동작을 위임합니다.
- 송신 근거: RhythmTrainer/Services/BeatAnalysisService.swift:4 · BeatThisBridge — Typed property dependency
- 수신 근거: RhythmTrainer/Services/Library/BeatThis_Bridging-Header/BeatThisBridge.h:5 · BeatThisBridge — Objective-C interface boundary

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Grid + Song + Song Package를 전송합니다.
- 목적: Grid + Song + Song Package를 전송합니다.
- 데이터: Grid + Song + Song Package
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Grid + Song + Song Package를 전송합니다.
- 목적: Grid + Song + Song Package를 전송합니다.
- 데이터: Grid + Song + Song Package
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → 메시징 게이트웨이

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Grid + Song + Song Package를 전송합니다.
- 목적: Grid + Song + Song Package를 전송합니다.
- 데이터: Grid + Song + Song Package
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:51 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:65 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Stop를 전송합니다.
- 목적: Session Stop를 전송합니다.
- 데이터: Session Stop
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Stop를 전송합니다.
- 목적: Session Stop를 전송합니다.
- 데이터: Session Stop
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → 메시징 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Stop를 전송합니다.
- 목적: Session Stop를 전송합니다.
- 데이터: Session Stop
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:62 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:77 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 목적: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 데이터: Ping T2 + Ping T3 + Sync Ping
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainerWatch Watch App

- API / 프로토콜: WCSession · sendMessage
- 동작: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 목적: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 데이터: Ping T2 + Ping T3 + Sync Ping
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainer → 메시징 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 목적: Ping T2 + Ping T3 + Sync Ping를 전송합니다.
- 데이터: Ping T2 + Ping T3 + Sync Ping
- 송신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:103 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:84 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Start + Song Start Watch를 전송합니다.
- 목적: Session Start + Song Start Watch를 전송합니다.
- 데이터: Session Start + Song Start Watch
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Start + Song Start Watch를 전송합니다.
- 목적: Session Start + Song Start Watch를 전송합니다.
- 데이터: Session Start + Song Start Watch
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → 메시징 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: Session Start + Song Start Watch를 전송합니다.
- 목적: Session Start + Song Start Watch를 전송합니다.
- 데이터: Session Start + Song Start Watch
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:44 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: Alert State를 전송합니다.
- 목적: Alert State를 전송합니다.
- 데이터: Alert State
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · sendMessage
- 동작: Alert State를 전송합니다.
- 목적: Alert State를 전송합니다.
- 데이터: Alert State
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → 메시징 게이트웨이

- API / 프로토콜: WCSession · sendMessage
- 동작: Alert State를 전송합니다.
- 목적: Alert State를 전송합니다.
- 데이터: Alert State
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:52 · sendMessage — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:137 · didReceiveMessage — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → RhythmTrainer

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Session Result를 전송합니다.
- 목적: Session Result를 전송합니다.
- 데이터: Session Result
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### 메시징 게이트웨이 → RhythmTrainer

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Session Result를 전송합니다.
- 목적: Session Result를 전송합니다.
- 데이터: Session Result
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainerWatch Watch App → 메시징 게이트웨이

- API / 프로토콜: WCSession · transferUserInfo
- 동작: Session Result를 전송합니다.
- 목적: Session Result를 전송합니다.
- 데이터: Session Result
- 송신 근거: RhythmTrainerWatch Watch App/Services/WatchConnectivityManager.swift:59 · transferUserInfo — Direct WatchConnectivity send call
- 수신 근거: RhythmTrainer/WatchConnectivity/PhoneConnectivityManager.swift:156 · didReceiveUserInfo — WatchConnectivity delegate receive handler

### RhythmTrainer → 외부 파일 저장소

- 동작: 사용자가 선택한 파일에 접근합니다.
- 목적: 파일 읽기
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 외부 파일 저장소 → RhythmTrainer

- API / 프로토콜: Security-scoped URL · AVFoundation
- 동작: 선택한 파일 URL을 제공합니다.
- 데이터: 파일 URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### 외부 파일 저장소 → 애플리케이션 서비스 경계

- API / 프로토콜: Security-scoped URL · AVFoundation
- 동작: 읽을 파일 URL을 제공합니다.
- 데이터: 파일 URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 송신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:31 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:33 · startAccessingSecurityScopedResource — Reads a user-selected audio file through a security-scoped URL
- 수신 근거: RhythmTrainer/Services/SongUploadService.swift:40 · AVAudioFile(forReading:) — Reads a user-selected audio file through a security-scoped URL

### RhythmTrainer → 애플리케이션 데이터 저장소

- API / 프로토콜: SwiftData ModelContext
- 동작: 애플리케이션 데이터를 저장합니다.
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

### 영속성 경계 → 애플리케이션 데이터 저장소

- API / 프로토콜: SwiftData ModelContext
- 동작: 애플리케이션 데이터를 저장합니다.
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

### 애플리케이션 데이터 저장소 → RhythmTrainer

- API / 프로토콜: SwiftData ModelContext
- 동작: 저장된 애플리케이션 데이터를 조회합니다.
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 송신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:97 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:111 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:132 — Direct persistence read call
- 수신 근거: RhythmTrainer/Models/PracticeSessionStore.swift:145 — Direct persistence read call

### 애플리케이션 데이터 저장소 → 영속성 경계

- API / 프로토콜: SwiftData ModelContext
- 동작: 저장된 애플리케이션 데이터를 조회합니다.
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

- [element-technology-removed] external-file-store
- [relationship-duplicate-removed] external-file-store-rhythmtrainer-ios-app-선택한-파일-url을-제공합니다-2
- [relationship-duplicate-removed] external-file-store-rhythmtrainer-ios-app-application-service-읽을-파일-url을-제공합니다-2
- [relationship-duplicate-removed] external-file-store-rhythmtrainer-ios-app-선택한-파일-url을-제공합니다-3
- [relationship-duplicate-removed] external-file-store-rhythmtrainer-ios-app-application-service-읽을-파일-url을-제공합니다-3
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-3
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-애플리케이션-데이터를-조회합니다-2
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-애플리케이션-데이터를-조회합니다-2
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-4
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-4
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-애플리케이션-데이터를-조회합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-애플리케이션-데이터를-조회합니다-3
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-저장된-애플리케이션-데이터를-조회합니다-4
- [relationship-duplicate-removed] rhythmtrainer-application-data-store-rhythmtrainer-ios-app-persistence-저장된-애플리케이션-데이터를-조회합니다-4
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-5
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-5
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-6
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-6
- [relationship-duplicate-removed] rhythmtrainer-ios-app-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-7
- [relationship-duplicate-removed] rhythmtrainer-ios-app-persistence-rhythmtrainer-application-data-store-애플리케이션-데이터를-저장합니다-7

## 모델 검토 항목

- 없음
