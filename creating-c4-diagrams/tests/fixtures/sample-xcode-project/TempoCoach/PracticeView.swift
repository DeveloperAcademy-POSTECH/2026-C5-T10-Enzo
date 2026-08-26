import SwiftUI

struct PracticeView: View {
    let bridge: SessionBridging
    let store: RhythmStoring

    var body: some View {
        Button("Start practice") {
            startPractice()
        }
    }

    private func startPractice() {
        let session = PracticeSession(id: UUID(), score: 0)
        try? store.save(session)
        bridge.sendSession(session)
    }
}

struct LyricScoring {
    let session: PracticeSession

    func score() -> Double {
        session.score
    }
}
