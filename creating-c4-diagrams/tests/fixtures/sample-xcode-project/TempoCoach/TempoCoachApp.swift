import SwiftUI

@main
struct TempoCoachApp: App {
    private let bridge = SessionBridge()
    private let store = SwiftDataRhythmStore()

    var body: some Scene {
        WindowGroup {
            PracticeView(bridge: bridge, store: store)
        }
    }
}
