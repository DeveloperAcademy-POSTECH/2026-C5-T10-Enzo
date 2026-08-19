import SceneKit
import UIKit

/// C3_Piggy의 AssetLoader를 그대로 따르는 작은 에셋 로더다.
enum AssetLoader {
    @MainActor
    static func object(
        named name: String,
        fallback: @MainActor () -> SCNNode
    ) -> SCNNode {
        object(named: name) ?? fallback()
    }

    @MainActor
    static func object(named name: String) -> SCNNode? {
        for ext in ["usdz", "usdc", "usda"] {
            if let url = Bundle.main.url(forResource: name, withExtension: ext),
               let scene = try? SCNScene(url: url, options: nil) {
                return wrap(scene)
            }
        }
        return nil
    }

    static func voxelBox(
        width: CGFloat,
        height: CGFloat,
        length: CGFloat,
        color: UIColor
    ) -> SCNNode {
        let box = SCNBox(
            width: width * 0.96,
            height: height * 0.96,
            length: length * 0.96,
            chamferRadius: 0.02
        )
        let material = SCNMaterial()
        material.diffuse.contents = color
        material.lightingModel = .blinn
        box.materials = [material]
        return SCNNode(geometry: box)
    }

    private static func wrap(_ scene: SCNScene) -> SCNNode {
        let node = SCNNode()
        scene.rootNode.childNodes.forEach { node.addChildNode($0.clone()) }
        return node
    }
}
