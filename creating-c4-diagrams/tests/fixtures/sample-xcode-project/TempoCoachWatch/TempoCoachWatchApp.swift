import SwiftUI
import WatchConnectivity

@main
struct TempoCoachWatchApp: App {
    private let sampler: MotionSampling = MotionSampler()

    var body: some Scene {
        WindowGroup {
            Button("Measure rhythm") {
                sampler.start()
                WCSession.default.sendMessage(["request": "beat"], replyHandler: nil)
            }
        }
    }
}
