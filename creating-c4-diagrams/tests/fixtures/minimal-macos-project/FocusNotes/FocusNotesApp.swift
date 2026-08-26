import SwiftUI

@main
struct FocusNotesApp: App {
    private let store = NoteStore()

    var body: some Scene {
        WindowGroup {
            Text(store.latestTitle)
        }
    }
}
