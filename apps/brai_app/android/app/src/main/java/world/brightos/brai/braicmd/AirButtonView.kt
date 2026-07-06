package world.brightos.brai.braicmd

import world.brightos.brai.R

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.os.SystemClock
import android.view.View
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

class AirButtonView(context: Context) : View(context) {
    private val iconBitmap = BitmapFactory.decodeResource(resources, R.drawable.bright_command_large_hex)
    private val iconBounds = Rect()
    private val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeWidth = 5f
        color = COLOR_ICON_RED
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_ICON_RED
        textAlign = Paint.Align.CENTER
        textSize = 24f
        isFakeBoldText = true
    }

    private var state: RecorderState = RecorderState.Idle

    fun setRecorderState(next: RecorderState) {
        state = next
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = minOf(width, height) * 0.46f

        drawIcon(canvas)

        when (val current = state) {
            is RecorderState.Recording -> drawAmplitude(canvas, cx, cy, radius, current.amplitude)
            is RecorderState.Uploading -> drawSpinner(canvas, cx, cy, radius)
            is RecorderState.Pending -> drawPendingCount(canvas, cx, cy, current.recordings + current.transcripts)
            is RecorderState.TranscriptReady -> drawPendingCount(canvas, cx, cy, current.transcripts)
            is RecorderState.Error -> drawError(canvas, cx, cy)
            else -> Unit
        }

        if (state is RecorderState.Recording || state is RecorderState.Uploading) {
            postInvalidateOnAnimation()
        }
    }

    private fun drawIcon(canvas: Canvas) {
        iconBounds.set(0, 0, width, height)
        canvas.drawBitmap(iconBitmap, null, iconBounds, bitmapPaint)
    }

    private fun drawAmplitude(canvas: Canvas, cx: Float, cy: Float, radius: Float, amplitude: Int) {
        val normalized = max(0.1f, (amplitude.coerceAtMost(12000) / 12000f))
        strokePaint.color = currentIconSoftColor()
        strokePaint.strokeWidth = width * 0.035f
        val time = SystemClock.uptimeMillis() / 130.0
        repeat(14) { index ->
            val angle = (Math.PI * 2.0 * index / 14.0) + time * 0.04
            val wave = ((sin(time + index) + 1.0) / 2.0).toFloat()
            val inner = radius * 0.82f
            val outer = radius * (0.98f + normalized * 0.34f * wave)
            canvas.drawLine(
                cx + cos(angle).toFloat() * inner,
                cy + sin(angle).toFloat() * inner,
                cx + cos(angle).toFloat() * outer,
                cy + sin(angle).toFloat() * outer,
                strokePaint
            )
        }
    }

    private fun drawSpinner(canvas: Canvas, cx: Float, cy: Float, radius: Float) {
        strokePaint.color = currentIconColor()
        strokePaint.strokeWidth = width * 0.07f
        val phase = ((SystemClock.uptimeMillis() / 6L) % 360).toFloat()
        canvas.drawArc(RectF(cx - radius * 0.55f, cy - radius * 0.55f, cx + radius * 0.55f, cy + radius * 0.55f), phase, 250f, false, strokePaint)
    }

    private fun drawPendingCount(canvas: Canvas, cx: Float, cy: Float, count: Int) {
        val label = count.coerceAtLeast(1).coerceAtMost(99).toString()
        textPaint.color = currentIconColor()
        textPaint.textSize = if (label.length == 1) width * 0.42f else width * 0.34f
        canvas.drawText(label, cx, cy - ((textPaint.descent() + textPaint.ascent()) / 2f) - height * 0.05f, textPaint)

        strokePaint.color = currentIconColor()
        strokePaint.strokeWidth = width * 0.045f
        val trayTop = cy + height * 0.22f
        val tray = RectF(cx - width * 0.18f, trayTop, cx + width * 0.18f, trayTop + height * 0.11f)
        canvas.drawLine(tray.left, tray.top, tray.left + width * 0.06f, tray.bottom, strokePaint)
        canvas.drawLine(tray.right, tray.top, tray.right - width * 0.06f, tray.bottom, strokePaint)
        canvas.drawLine(tray.left + width * 0.06f, tray.bottom, tray.right - width * 0.06f, tray.bottom, strokePaint)
    }

    private fun drawError(canvas: Canvas, cx: Float, cy: Float) {
        textPaint.color = currentIconColor()
        canvas.drawText("!", cx, cy - ((textPaint.descent() + textPaint.ascent()) / 2f), textPaint)
    }

    private fun currentIconColor(): Int =
        when (state) {
            is RecorderState.Pending,
            is RecorderState.TranscriptReady,
            is RecorderState.Error -> COLOR_ICON_LIGHT
            else -> COLOR_ICON_RED
        }

    private fun currentIconSoftColor(): Int =
        when (state) {
            is RecorderState.Error -> COLOR_ICON_LIGHT_SOFT
            else -> COLOR_ICON_RED_SOFT
        }

    companion object {
        private const val COLOR_ICON_RED = 0xFFFF2020.toInt()
        private const val COLOR_ICON_LIGHT = 0xFFEFF4F7.toInt()
        private const val COLOR_ICON_RED_SOFT = 0xB8FF2020.toInt()
        private const val COLOR_ICON_LIGHT_SOFT = 0xB8EFF4F7.toInt()
    }
}
