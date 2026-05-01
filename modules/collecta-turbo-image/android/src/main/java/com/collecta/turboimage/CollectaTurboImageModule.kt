package com.collecta.turboimage

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.SystemClock
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CollectaTurboImageModule(reactContext: ReactApplicationContext) :
  NativeCollectaTurboImageSpec(reactContext) {

  override fun getName(): String = NAME

  override fun compressImage(
    uri: String,
    maxWidth: Double,
    quality: Double,
    stripExif: Boolean,
    format: String,
    promise: Promise
  ) {
    val startedAt = SystemClock.elapsedRealtime()

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val bitmap = decodeSampled(uri, maxWidth.toInt())
          ?: throw IllegalStateException("Failed to decode image at $uri")

        val outFile = File(
          reactApplicationContext.cacheDir,
          "collecta-${UUID.randomUUID()}.${extensionFor(format)}"
        )

        val compressFormat = when (format.lowercase()) {
          "png" -> Bitmap.CompressFormat.PNG
          "webp" -> Bitmap.CompressFormat.WEBP_LOSSY
          else -> Bitmap.CompressFormat.JPEG
        }

        FileOutputStream(outFile).use { fos ->
          bitmap.compress(compressFormat, (quality * 100).toInt().coerceIn(0, 100), fos)
        }

        if (stripExif && compressFormat == Bitmap.CompressFormat.JPEG) {
          stripExifMetadata(outFile)
        }

        val width = bitmap.width
        val height = bitmap.height
        bitmap.recycle()

        val durationMs = (SystemClock.elapsedRealtime() - startedAt).toDouble()

        val result = WritableNativeMap().apply {
          putString("uri", Uri.fromFile(outFile).toString())
          putDouble("size", outFile.length().toDouble())
          putDouble("width", width.toDouble())
          putDouble("height", height.toDouble())
          putDouble("durationMs", durationMs)
        }
        promise.resolve(result)
      } catch (t: Throwable) {
        promise.reject("E_COMPRESS", t.message ?: "Compression failed", t)
      }
    }
  }

  private fun openInputStream(uri: String): InputStream? {
    val parsed = Uri.parse(uri)
    return when {
      parsed.scheme == "file" || parsed.scheme == null -> {
        val path = parsed.path ?: return null
        File(path).inputStream()
      }
      parsed.scheme == "content" ->
        reactApplicationContext.contentResolver.openInputStream(parsed)
      else -> null
    }
  }

  private fun decodeSampled(uri: String, maxWidth: Int): Bitmap? {
    val boundsOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, boundsOpts) }

    val srcWidth = boundsOpts.outWidth
    if (srcWidth <= 0) return null

    var sample = 1
    while (srcWidth / (sample * 2) >= maxWidth) sample *= 2

    val opts = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val sampled = openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, opts)
    } ?: return null

    if (sampled.width <= maxWidth) return sampled
    val scale = maxWidth.toFloat() / sampled.width
    val targetH = (sampled.height * scale).toInt()
    val scaled = Bitmap.createScaledBitmap(sampled, maxWidth, targetH, true)
    if (scaled !== sampled) sampled.recycle()
    return scaled
  }

  private fun stripExifMetadata(file: File) {
    val exif = ExifInterface(file.absolutePath)
    val tags = listOf(
      ExifInterface.TAG_GPS_LATITUDE,
      ExifInterface.TAG_GPS_LATITUDE_REF,
      ExifInterface.TAG_GPS_LONGITUDE,
      ExifInterface.TAG_GPS_LONGITUDE_REF,
      ExifInterface.TAG_GPS_ALTITUDE,
      ExifInterface.TAG_GPS_ALTITUDE_REF,
      ExifInterface.TAG_GPS_TIMESTAMP,
      ExifInterface.TAG_GPS_DATESTAMP,
      ExifInterface.TAG_DATETIME,
      ExifInterface.TAG_DATETIME_ORIGINAL,
      ExifInterface.TAG_DATETIME_DIGITIZED,
      ExifInterface.TAG_MAKE,
      ExifInterface.TAG_MODEL,
      ExifInterface.TAG_SOFTWARE,
      ExifInterface.TAG_USER_COMMENT,
    )
    for (tag in tags) exif.setAttribute(tag, null)
    exif.saveAttributes()
  }

  private fun extensionFor(format: String): String = when (format.lowercase()) {
    "png" -> "png"
    "heic" -> "heic"
    "webp" -> "webp"
    else -> "jpg"
  }

  companion object {
    const val NAME = "CollectaTurboImage"
  }
}
