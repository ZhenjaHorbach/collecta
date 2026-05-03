import Foundation
import ImageIO
import MobileCoreServices
import UIKit

@objc public class CollectaTurboImageImpl: NSObject {
  @objc public static let shared = CollectaTurboImageImpl()

  @objc public func compress(
    uri: String,
    maxWidth: Double,
    quality: Double,
    stripExif: Bool,
    format: String,
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String) -> Void
  ) {
    let startedAt = CACurrentMediaTime()

    DispatchQueue.global(qos: .userInitiated).async {
      autoreleasepool {
        guard let url = self.resolveSourceURL(uri),
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data)
        else {
          reject("E_DECODE", "Failed to decode image at \(uri)")
          return
        }

        let scale = image.size.width > CGFloat(maxWidth) ? CGFloat(maxWidth) / image.size.width : 1.0
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderFormat = UIGraphicsImageRendererFormat.default()
        renderFormat.scale = 1.0
        renderFormat.opaque = true
        let resized = UIGraphicsImageRenderer(size: targetSize, format: renderFormat).image { _ in
          image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        self.writeAndResolve(
          image: resized,
          targetSize: targetSize,
          format: format,
          quality: quality,
          stripExif: stripExif,
          startedAt: startedAt,
          resolve: resolve,
          reject: reject
        )
      }
    }
  }

  // MARK: - Helpers

  private func resolveSourceURL(_ uri: String) -> URL? {
    if uri.hasPrefix("file://") || uri.hasPrefix("http") {
      return URL(string: uri)
    }
    return URL(fileURLWithPath: uri)
  }

  private func uniformType(for format: String) -> CFString {
    switch format.lowercased() {
    case "heic": return "public.heic" as CFString
    case "png": return kUTTypePNG
    default: return kUTTypeJPEG
    }
  }

  private func fileExtension(for format: String) -> String {
    switch format.lowercased() {
    case "heic": return "heic"
    case "png": return "png"
    default: return "jpg"
    }
  }

  private func writeAndResolve(
    image: UIImage,
    targetSize: CGSize,
    format: String,
    quality: Double,
    stripExif: Bool,
    startedAt: CFTimeInterval,
    resolve: ([String: Any]) -> Void,
    reject: (String, String) -> Void
  ) {
    let ext = fileExtension(for: format)
    let filename = "collecta-\(UUID().uuidString).\(ext)"
    let outURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)

    guard
      let dest = CGImageDestinationCreateWithURL(
        outURL as CFURL, uniformType(for: format), 1, nil),
      let cg = image.cgImage
    else {
      reject("E_DEST", "Failed to create image destination")
      return
    }

    // stripExif is implicitly satisfied: UIGraphicsImageRenderer produces a
    // metadata-free bitmap, so the encoded output never carries EXIF/GPS/TIFF
    // even without explicit removal. Passing NSNull for those keys here causes
    // ImageIO to silently drop the image data and write a 20-byte header-only
    // JPEG, which Anthropic Vision then rejects with "Could not process image".
    _ = stripExif
    let props: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: quality]

    CGImageDestinationAddImage(dest, cg, props as CFDictionary)
    guard CGImageDestinationFinalize(dest) else {
      reject("E_WRITE", "Failed to finalize image")
      return
    }

    let attrs = try? FileManager.default.attributesOfItem(atPath: outURL.path)
    let size = (attrs?[.size] as? NSNumber)?.intValue ?? 0
    let durationMs = (CACurrentMediaTime() - startedAt) * 1000.0

    resolve([
      "uri": outURL.absoluteString,
      "size": size,
      "width": Double(targetSize.width),
      "height": Double(targetSize.height),
      "durationMs": durationMs,
    ])
  }
}
