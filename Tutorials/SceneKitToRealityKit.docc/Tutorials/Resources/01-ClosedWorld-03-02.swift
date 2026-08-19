import SceneKit
import UIKit

@MainActor
final class ClosedWorld {
    let scene = SCNScene()
    let pigNode = PigPlacement.makePigNode()

    init() {
        scene.background.contents = UIColor.black
        scene.rootNode.addChildNode(RoomBuilder.build())
        scene.rootNode.addChildNode(FakeSofa.makeSofaNode())
        scene.rootNode.addChildNode(pigNode)
        addCamera()
        addLight()
    }

    private func addCamera() {
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(0, 4, 9)
        cameraNode.look(at: SCNVector3(0, 1, 0))
        scene.rootNode.addChildNode(cameraNode)
    }

    private func addLight() {
        let lightNode = SCNNode()
        lightNode.light = SCNLight()
        lightNode.light?.type = .omni
        lightNode.light?.intensity = 1_100
        lightNode.position = SCNVector3(0, 5, 3)
        scene.rootNode.addChildNode(lightNode)
    }
}
