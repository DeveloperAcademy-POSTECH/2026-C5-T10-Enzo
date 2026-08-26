import XCTest

final class WatchBridgeTests: XCTestCase {
    func testPlaceholder() {
        let matcher = BeatMatcher()
        let coach = RhythmCoach()
        XCTAssertEqual(coach.state(for: matcher.match(0.5)), "normal")
    }
}
