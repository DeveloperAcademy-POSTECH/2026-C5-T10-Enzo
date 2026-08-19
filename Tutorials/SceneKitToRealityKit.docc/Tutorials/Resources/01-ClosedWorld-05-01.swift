import SceneKit

enum NodeInspector {
    static func describe(_ node: SCNNode) -> [String] {
        var lines: [String] = []

        if let geometry = node.geometry {
            lines.append("geometry: \(type(of: geometry))")
        }
        if let physicsBody = node.physicsBody {
            lines.append("physicsBody: \(physicsBody.type)")
        }
        for key in node.actionKeys {
            lines.append("action[\(key)]: \(String(describing: node.action(forKey: key)))")
        }
        return lines
    }
}
