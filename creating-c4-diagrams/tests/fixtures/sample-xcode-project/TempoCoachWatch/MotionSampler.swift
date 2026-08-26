import CoreMotion
import HealthKit
import WatchConnectivity

protocol MotionSampling { func start() }

final class MotionSampler: MotionSampling {
    private let manager = CMMotionManager()

    func start() {
        manager.startDeviceMotionUpdates()
    }
}

final class WatchSessionAdapter: NSObject, WCSessionDelegate {
    func sendResult() {
        WCSession.default.transferUserInfo(["sessionResult": 92.0])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        _ = userInfo["song"]
        _ = userInfo["beatGrid"]
    }
}

final class RhythmJudge {
    private let sampler: MotionSampling

    init(sampler: MotionSampling) {
        self.sampler = sampler
    }

    func start() {
        sampler.start()
    }
}

final class WorkoutSessionManager {
    private let store: HKHealthStore

    init(store: HKHealthStore = HKHealthStore()) {
        self.store = store
    }
}

struct BeatMatcher {
    func match(_ swing: Double) -> Bool {
        swing >= 0
    }
}

struct RhythmCoach {
    func state(for matched: Bool) -> String {
        matched ? "normal" : "offBeat"
    }
}
