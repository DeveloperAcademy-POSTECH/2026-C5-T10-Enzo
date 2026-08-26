import Foundation

protocol NoteStoring {
    var latestTitle: String { get }
    func save(title: String) throws
}

final class NoteStore: NoteStoring {
    private let fileURL = URL.documentsDirectory.appending(path: "notes.json")
    var latestTitle: String { "New note" }

    func save(title: String) throws {
        try Data(title.utf8).write(to: fileURL, options: .atomic)
    }
}
