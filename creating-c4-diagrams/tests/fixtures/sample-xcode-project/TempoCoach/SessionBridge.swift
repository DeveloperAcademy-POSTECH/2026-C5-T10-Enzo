import Foundation
import WatchConnectivity

protocol SessionBridging {
    func sendSession(_ session: PracticeSession)
}

final class SessionBridge: NSObject, SessionBridging, WCSessionDelegate {
    func sendSession(_ session: PracticeSession) {
        WCSession.default.transferUserInfo(["song": session.id.uuidString, "beatGrid": session.score])
    }

    func sendClockProbe() {
        WCSession.default.sendMessage(["pingT1": Date().timeIntervalSince1970], replyHandler: nil)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        _ = userInfo["song"]
        _ = userInfo["beatGrid"]
        _ = userInfo["sessionResult"]
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        _ = message["pingT1"]
        replyHandler(["pingT2": Date().timeIntervalSince1970])
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {}
}
