import SceneKit
import SwiftUI

/// C3_Piggy의 SceneContainerView 패턴을 닫힌 세계에 맞게 줄인 버전이다.
@MainActor
struct ClosedWorldSceneView: UIViewRepresentable {
    let scene: SCNScene
    let pigNode: SCNNode

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = scene
        view.allowsCameraControl = false
        view.autoenablesDefaultLighting = false
        view.backgroundColor = .black

        let tap = UITapGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.hidePig)
        )
        view.addGestureRecognizer(tap)
        return view
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(pigNode: pigNode)
    }

    @MainActor
    final class Coordinator: NSObject {
        private let pigNode: SCNNode

        init(pigNode: SCNNode) {
            self.pigNode = pigNode
        }

        @objc func hidePig() {
            pigNode.runAction(HideAction.makeMoveAction())
        }
    }
}
