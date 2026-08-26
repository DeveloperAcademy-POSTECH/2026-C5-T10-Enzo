#import "BeatEngineBridge.h"

@implementation BeatEngineBridge
- (NSArray<NSNumber *> *)detectBeats:(NSArray<NSNumber *> *)samples {
    _engine->process_audio(samples.count);
    return @[];
}
@end
