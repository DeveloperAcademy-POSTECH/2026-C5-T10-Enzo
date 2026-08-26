import Foundation
import SwiftData

@Model final class PracticeSession {
    var id: UUID
    var score: Double

    init(id: UUID, score: Double) {
        self.id = id
        self.score = score
    }
}

protocol RhythmStoring {
    func save(_ session: PracticeSession) throws
}

final class SwiftDataRhythmStore: RhythmStoring {
    private let context: ModelContext

    init(context: ModelContext = ModelContext(try! ModelContainer(for: PracticeSession.self))) {
        self.context = context
    }

    func save(_ session: PracticeSession) throws {
        context.insert(session)
        try context.save()
    }
}
