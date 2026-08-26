#import <Foundation/Foundation.h>

@interface BeatEngineBridge : NSObject
- (NSArray<NSNumber *> *)detectBeats:(NSArray<NSNumber *> *)samples;
@end
