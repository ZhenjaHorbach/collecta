#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <RNCollectaTurboImageSpec/RNCollectaTurboImageSpec.h>

#if __has_include(<collecta_turbo_image/collecta_turbo_image-Swift.h>)
#import <collecta_turbo_image/collecta_turbo_image-Swift.h>
#else
#import "collecta_turbo_image-Swift.h"
#endif

@interface CollectaTurboImage : NSObject <NativeCollectaTurboImageSpec>
@end

@implementation CollectaTurboImage

RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCollectaTurboImageSpecJSI>(params);
}

- (void)compressImage:(NSString *)uri
             maxWidth:(double)maxWidth
              quality:(double)quality
            stripExif:(BOOL)stripExif
               format:(NSString *)format
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  [[CollectaTurboImageImpl shared]
      compressWithUri:uri
             maxWidth:maxWidth
              quality:quality
            stripExif:stripExif
               format:format
              resolve:^(NSDictionary<NSString *, id> *_Nonnull result) {
                resolve(result);
              }
               reject:^(NSString *_Nonnull code, NSString *_Nonnull message) {
                 reject(code, message, nil);
               }];
}

@end
