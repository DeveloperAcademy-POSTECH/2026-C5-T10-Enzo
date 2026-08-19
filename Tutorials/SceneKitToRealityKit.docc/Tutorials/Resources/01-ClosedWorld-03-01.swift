import SceneKit
import UIKit

@MainActor
enum RoomBuilder {
    static func build() -> SCNNode {
        let room = SCNNode()
        room.name = "Room"

        let floor = AssetLoader.object(named: "Ground_Color") {
            AssetLoader.voxelBox(width: 8, height: 0.2, length: 8, color: .darkGray)
        }
        floor.name = "Floor"
        floor.position = SCNVector3(0, -0.1, 0)
        room.addChildNode(floor)

        let wallSize = (width: CGFloat(8), height: CGFloat(3), length: CGFloat(0.2))
        let walls: [(name: String, position: SCNVector3, yaw: Float)] = [
            ("Wall_North", SCNVector3(0, 1.5, -4), 0),
            ("Wall_South", SCNVector3(0, 1.5, 4), 0),
            ("Wall_West", SCNVector3(-4, 1.5, 0), .pi / 2),
            ("Wall_East", SCNVector3(4, 1.5, 0), .pi / 2)
        ]

        for wall in walls {
            let node = AssetLoader.voxelBox(
                width: wallSize.width,
                height: wallSize.height,
                length: wallSize.length,
                color: .systemIndigo
            )
            node.name = wall.name
            node.position = wall.position
            node.eulerAngles.y = wall.yaw
            room.addChildNode(node)
        }
        return room
    }
}
