import SceneKit
import UIKit

@MainActor
enum PigPlacement {
    static let hardcodedPosition = SCNVector3(0, 0, 1.5)

    static func makePigNode() -> SCNNode {
        let pig = AssetLoader.object(named: "Piggy") {
            AssetLoader.voxelBox(width: 1, height: 0.8, length: 0.7, color: .systemPink)
        }
        pig.name = "Piggy"
        let groundedY = normalize(pig, toHeight: 1.5)
        pig.position = SCNVector3(
            hardcodedPosition.x,
            hardcodedPosition.y + groundedY,
            hardcodedPosition.z
        )
        return pig
    }

    /// C3_Piggy의 PigController처럼 하위 geometry를 모두 재서 모델 크기를 맞춘다.
    private static func normalize(_ node: SCNNode, toHeight targetHeight: Float) -> Float {
        guard let (low, high) = unionBoundingBox(in: node) else { return 0 }
        let height = high.y - low.y
        guard height > 0.0001 else { return 0 }

        let scale = targetHeight / height
        node.scale = SCNVector3(scale, scale, scale)
        return -low.y * scale
    }

    private static func unionBoundingBox(in root: SCNNode) -> (SCNVector3, SCNVector3)? {
        var low = SCNVector3(
            Float.greatestFiniteMagnitude,
            Float.greatestFiniteMagnitude,
            Float.greatestFiniteMagnitude
        )
        var high = SCNVector3(
            -Float.greatestFiniteMagnitude,
            -Float.greatestFiniteMagnitude,
            -Float.greatestFiniteMagnitude
        )
        var foundGeometry = false

        root.enumerateHierarchy { node, _ in
            guard let geometry = node.geometry else { return }
            let (minimum, maximum) = geometry.boundingBox
            for x in [minimum.x, maximum.x] {
                for y in [minimum.y, maximum.y] {
                    for z in [minimum.z, maximum.z] {
                        let point = node.convertPosition(SCNVector3(x, y, z), to: root)
                        low = SCNVector3(min(low.x, point.x), min(low.y, point.y), min(low.z, point.z))
                        high = SCNVector3(max(high.x, point.x), max(high.y, point.y), max(high.z, point.z))
                        foundGeometry = true
                    }
                }
            }
        }
        return foundGeometry ? (low, high) : nil
    }
}
