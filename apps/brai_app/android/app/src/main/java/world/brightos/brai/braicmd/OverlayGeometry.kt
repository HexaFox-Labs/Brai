package world.brightos.brai.braicmd

import android.os.Build
import android.view.WindowInsets
import android.view.WindowManager
import world.brightos.brai.capabilities.BraiAccessibilityService
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sin

internal data class OverlayAnchor(
    val x: Int,
    val y: Int,
    val size: Int
)

internal data class OverlayPoint(
    val x: Int,
    val y: Int
)

internal data class OverlayBounds(
    val left: Int,
    val top: Int,
    val right: Int,
    val bottom: Int
) {
    fun inset(value: Int): OverlayBounds = OverlayBounds(
        left = left + value,
        top = top + value,
        right = max(left + value, right - value),
        bottom = max(top + value, bottom - value)
    )
}

internal data class RadialMenuLayout(
    val hub: OverlayAnchor,
    val actions: List<OverlayPoint>,
    val radius: Int
)

internal class OverlayGeometry(
    private val service: BraiAccessibilityService,
    private val mainSizePx: Int,
    private val screenshotSizePx: Int,
    private val screenshotGapPx: Int,
    private val cancelSizePx: Int,
    private val cancelGapPx: Int
) {
    fun defaultButtonX(): Int = visibleBounds().right - mainSizePx - service.dp(18)

    fun defaultButtonY(): Int = visibleBounds().bottom - mainSizePx - service.dp(132)

    fun screenshotButtonX(buttonX: Int): Int {
        val bounds = visibleBounds().inset(service.dp(8))
        val maxPosition = max(bounds.left, bounds.right - screenshotSizePx)
        return (buttonX + ((mainSizePx - screenshotSizePx) / 2)).coerceIn(bounds.left, maxPosition)
    }

    fun screenshotButtonY(buttonY: Int): Int {
        val bounds = visibleBounds().inset(service.dp(8))
        val maxPosition = max(bounds.top, bounds.bottom - screenshotSizePx)
        return (buttonY - screenshotSizePx - screenshotGapPx).coerceIn(bounds.top, maxPosition)
    }

    fun cancelX(anchor: OverlayAnchor): Int =
        cancelAxisPosition(
            preferred = anchor.x - cancelSizePx - cancelGapPx,
            fallback = anchor.x + anchor.size + cancelGapPx,
            minPosition = visibleBounds().left,
            maxPosition = visibleBounds().right - cancelSizePx
        )

    fun cancelY(anchor: OverlayAnchor): Int =
        cancelAxisPosition(
            preferred = anchor.y + ((anchor.size - cancelSizePx) / 2),
            fallback = anchor.y + ((anchor.size - cancelSizePx) / 2),
            minPosition = visibleBounds().top,
            maxPosition = visibleBounds().bottom - cancelSizePx
        )

    fun radialMenuLayout(hub: OverlayAnchor, actionSize: Int, count: Int): RadialMenuLayout? =
        RadialActionLayout.layout(
            bounds = visibleBounds().inset(service.dp(8)),
            hub = hub,
            actionSize = actionSize,
            count = count,
            maxActionCount = 5,
            collisionGap = service.dp(6)
        )

    private fun cancelAxisPosition(preferred: Int, fallback: Int, minPosition: Int, maxPosition: Int): Int {
        val edge = service.dp(8)
        val lower = minPosition + edge
        val upper = max(lower, maxPosition - edge)
        val raw = if (preferred >= lower) preferred else fallback
        return raw.coerceIn(lower, upper)
    }

    private fun visibleBounds(): OverlayBounds {
        val metrics = service.resources.displayMetrics
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return OverlayBounds(0, statusBarHeight(), metrics.widthPixels, metrics.heightPixels - navigationBarHeight())
        }
        val windowManager = service.getSystemService(WindowManager::class.java)
        val windowMetrics = windowManager.currentWindowMetrics
        val insets = windowMetrics.windowInsets.getInsetsIgnoringVisibility(
            WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
        )
        return OverlayBounds(
            left = windowMetrics.bounds.left + insets.left,
            top = windowMetrics.bounds.top + insets.top,
            right = windowMetrics.bounds.right - insets.right,
            bottom = windowMetrics.bounds.bottom - insets.bottom
        )
    }

    private fun statusBarHeight(): Int = systemDimension("status_bar_height")

    private fun navigationBarHeight(): Int = systemDimension("navigation_bar_height")

    private fun systemDimension(name: String): Int {
        val id = service.resources.getIdentifier(name, "dimen", "android")
        return if (id == 0) 0 else service.resources.getDimensionPixelSize(id)
    }
}

internal object RadialActionLayout {
    fun layout(
        bounds: OverlayBounds,
        hub: OverlayAnchor,
        actionSize: Int,
        count: Int,
        maxActionCount: Int,
        collisionGap: Int
    ): RadialMenuLayout? {
        if (count <= 0) return null
        val radius = fixedRadius(hub.size, actionSize, maxActionCount, collisionGap)
        val extent = radius + actionSize / 2
        val originalCenter = center(hub)
        val horizontalCenter = originalCenter.first.coerceIn(
            bounds.left + extent.toDouble(),
            max(bounds.left + extent, bounds.right - extent).toDouble()
        )
        val verticalCenter = originalCenter.second.coerceIn(
            bounds.top + extent.toDouble(),
            max(bounds.top + extent, bounds.bottom - extent).toDouble()
        )
        val candidateCenters = listOf(
            originalCenter,
            Pair(originalCenter.first, verticalCenter),
            Pair(horizontalCenter, originalCenter.second),
            Pair(horizontalCenter, verticalCenter)
        ).distinct().sortedBy { point -> distance(point, originalCenter) }

        for (candidateCenter in candidateCenters) {
            val candidateHub = OverlayAnchor(
                x = (candidateCenter.first - hub.size / 2.0).roundToInt(),
                y = (candidateCenter.second - hub.size / 2.0).roundToInt(),
                size = hub.size
            )
            val inward = Math.toDegrees(
                atan2(
                    (bounds.top + bounds.bottom) / 2.0 - candidateCenter.second,
                    (bounds.left + bounds.right) / 2.0 - candidateCenter.first
                )
            )
            val angleSets = buildList {
                add(circleAngles(count, inward))
                for (offset in 0..180 step 5) {
                    add(arcAngles(count, inward + offset, 180.0))
                    if (offset > 0) add(arcAngles(count, inward - offset, 180.0))
                }
            }
            for (angles in angleSets) {
                val points = positionsFor(candidateHub, actionSize, radius, angles)
                if (positionsFit(points, bounds, candidateHub, actionSize, collisionGap)) {
                    return RadialMenuLayout(candidateHub, points, radius)
                }
            }
        }
        return null
    }

    fun fixedRadius(hubSize: Int, actionSize: Int, maxActionCount: Int, gap: Int): Int {
        val hubDistance = hubSize / 2.0 + actionSize / 2.0 + gap
        if (maxActionCount <= 1) return ceil(hubDistance).toInt()
        val halfCircleStep = 180.0 / (maxActionCount - 1)
        val halfStep = halfCircleStep * PI / 360.0
        val actionDistance = (actionSize + gap) / (2.0 * sin(halfStep))
        return ceil(max(hubDistance, actionDistance)).toInt() + 1
    }

    private fun circleAngles(count: Int, start: Double): List<Double> =
        List(count) { index -> start + index * (360.0 / count) }

    private fun arcAngles(count: Int, center: Double, span: Double): List<Double> {
        if (count == 1) return listOf(center)
        val step = span / (count - 1)
        return List(count) { index -> center - span / 2.0 + index * step }
    }

    private fun positionsFor(hub: OverlayAnchor, actionSize: Int, radius: Int, angles: List<Double>): List<OverlayPoint> {
        val centerX = hub.x + hub.size / 2.0
        val centerY = hub.y + hub.size / 2.0
        return angles.map { degrees ->
            val radians = degrees * PI / 180.0
            OverlayPoint(
                x = (centerX + cos(radians) * radius - actionSize / 2.0).roundToInt(),
                y = (centerY + sin(radians) * radius - actionSize / 2.0).roundToInt()
            )
        }
    }

    private fun positionsFit(
        positions: List<OverlayPoint>,
        bounds: OverlayBounds,
        hub: OverlayAnchor,
        actionSize: Int,
        gap: Int
    ): Boolean {
        val rects = positions.map { OverlayRect(it.x, it.y, it.x + actionSize, it.y + actionSize) }
        if (rects.any { !it.inside(bounds) }) return false
        val centers = positions.map { point -> Pair(point.x + actionSize / 2.0, point.y + actionSize / 2.0) }
        val hubCenter = center(hub)
        val hubDistance = hub.size / 2.0 + actionSize / 2.0 + gap
        val actionDistance = actionSize + gap.toDouble()
        if (centers.any { distance(it, hubCenter) < hubDistance }) return false
        for (index in centers.indices) {
            for (other in index + 1 until centers.size) {
                if (distance(centers[index], centers[other]) < actionDistance) return false
            }
        }
        return true
    }

    private fun center(anchor: OverlayAnchor): Pair<Double, Double> =
        Pair(anchor.x + anchor.size / 2.0, anchor.y + anchor.size / 2.0)

    private fun distance(first: Pair<Double, Double>, second: Pair<Double, Double>): Double =
        hypot(first.first - second.first, first.second - second.second)

    private data class OverlayRect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
        fun inside(bounds: OverlayBounds): Boolean =
            left >= bounds.left && top >= bounds.top && right <= bounds.right && bottom <= bounds.bottom
    }
}
