package world.brightos.brai.braicmd

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

class CancelButtonView(context: Context) : View(context) {
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.argb(150, 16, 37, 27)
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = Color.argb(220, 199, 220, 210)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = minOf(width, height) * 0.46f

        canvas.drawCircle(cx, cy, radius, fillPaint)

        strokePaint.strokeWidth = width * 0.09f
        val inset = width * 0.33f
        canvas.drawLine(inset, inset, width - inset, height - inset, strokePaint)
        canvas.drawLine(width - inset, inset, inset, height - inset, strokePaint)
    }
}
