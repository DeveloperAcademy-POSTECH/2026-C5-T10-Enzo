import SceneKit

@MainActor
enum HideAction {
    static func makeMoveAction() -> SCNAction {
        .move(to: FakeSofa.hardcodedPosition, duration: 0.5)
    }
}
