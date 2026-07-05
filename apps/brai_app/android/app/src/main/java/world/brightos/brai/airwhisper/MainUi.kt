package world.brightos.brai.airwhisper

import android.app.Activity
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView

internal data class StatusRow(
    val container: LinearLayout,
    val status: TextView,
    val button: Button
)

internal class MainUi(private val activity: Activity) {
    fun permissionRow(root: LinearLayout, title: String, subtitle: String, actionText: String, action: () -> Unit): StatusRow {
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }

        val textColumn = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
        }
        textColumn.addView(TextView(activity).apply {
            text = title
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
        })
        textColumn.addView(TextView(activity).apply {
            text = subtitle
            textSize = 13f
            setTextColor(COLOR_MUTED)
            setPadding(0, dp(2), 0, 0)
        })
        row.addView(textColumn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        val status = TextView(activity).apply {
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(4), dp(8), dp(4))
        }
        row.addView(status)

        val button = actionButton(actionText, action).apply {
            textSize = 13f
            minWidth = dp(86)
        }
        row.addView(button, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(40)).apply {
            setMargins(dp(8), 0, 0, 0)
        })

        root.addView(row, matchWrap().apply { setMargins(0, 0, 0, dp(8)) })
        return StatusRow(row, status, button)
    }

    fun settingsSwitchRow(
        title: String,
        subtitle: String,
        checked: Boolean,
        onCheckedChanged: (Boolean) -> Unit
    ): LinearLayout {
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val textColumn = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
        }
        textColumn.addView(TextView(activity).apply {
            text = title
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
        })
        textColumn.addView(TextView(activity).apply {
            text = subtitle
            textSize = 13f
            setTextColor(COLOR_MUTED)
            setPadding(0, dp(2), 0, 0)
        })
        row.addView(textColumn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(Switch(activity).apply {
            isChecked = checked
            setOnCheckedChangeListener { _, isChecked -> onCheckedChanged(isChecked) }
        })
        return row
    }

    fun settingsSliderRow(
        title: String,
        subtitle: String,
        value: Int,
        min: Int,
        max: Int,
        onValueChanged: (Int) -> Unit
    ): LinearLayout {
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
        }
        val header = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val textColumn = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
        }
        textColumn.addView(TextView(activity).apply {
            text = title
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
        })
        textColumn.addView(TextView(activity).apply {
            text = subtitle
            textSize = 13f
            setTextColor(COLOR_MUTED)
            setPadding(0, dp(2), 0, 0)
        })
        header.addView(textColumn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        val valueText = TextView(activity).apply {
            text = "${value.coerceIn(min, max)}%"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_ACCENT_TEXT)
            gravity = Gravity.CENTER
            minWidth = dp(54)
        }
        header.addView(valueText)
        row.addView(header)
        row.addView(SeekBar(activity).apply {
            this.max = max - min
            progress = value.coerceIn(min, max) - min
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val next = min + progress
                    valueText.text = "$next%"
                    if (fromUser) onValueChanged(next)
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) = Unit
                override fun onStopTrackingTouch(seekBar: SeekBar?) = Unit
            })
        }, matchWrap().apply { setMargins(0, dp(8), 0, 0) })
        return row
    }

    fun panel(): LinearLayout =
        LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = roundedBackground(COLOR_PANEL, COLOR_BORDER)
        }

    fun statusBlock(): TextView =
        TextView(activity).apply {
            textSize = 15f
            setTextColor(COLOR_TEXT)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }

    fun actionButton(textValue: String, action: () -> Unit): Button =
        Button(activity).apply {
            text = textValue
            isAllCaps = false
            gravity = Gravity.CENTER
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_ACTION_TEXT)
            background = roundedBackground(COLOR_ACCENT)
            setOnClickListener { action() }
        }

    fun sectionTitle(textValue: String): TextView =
        TextView(activity).apply {
            text = textValue
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
            setPadding(0, dp(8), 0, dp(8))
        }

    fun roundedBackground(color: Int, strokeColor: Int? = null): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(8).toFloat()
            if (strokeColor != null) setStroke(dp(1), strokeColor)
        }

    fun applyDarkSystemBars() {
        activity.window.statusBarColor = COLOR_BACKGROUND
        activity.window.navigationBarColor = COLOR_BACKGROUND
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            var flags = activity.window.decorView.systemUiVisibility
            flags = flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags = flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            }
            activity.window.decorView.systemUiVisibility = flags
        }
    }

    fun applyScreenEdgePadding(view: View) {
        val sidePadding = dp(0)
        val topPadding = dp(12)
        val bottomPadding = dp(18)
        view.setPadding(sidePadding, topPadding, sidePadding, bottomPadding)
        view.setOnApplyWindowInsetsListener { insetView, insets ->
            insetView.setPadding(
                sidePadding,
                topPadding + insets.systemWindowInsetTop,
                sidePadding,
                bottomPadding + insets.systemWindowInsetBottom
            )
            insets
        }
        view.requestApplyInsets()
    }

    fun dp(value: Int): Int = (value * activity.resources.displayMetrics.density).toInt()

    fun matchWrap(): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)

    fun matchHeight(height: Int): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height)
}

internal val COLOR_BACKGROUND = 0xFF050607.toInt()
internal val COLOR_PANEL = 0xFF0D1110.toInt()
internal val COLOR_INPUT = 0xFF111827.toInt()
internal val COLOR_TEXT = 0xFFCDE5DB.toInt()
internal val COLOR_MUTED = 0xFF8A9A94.toInt()
internal val COLOR_ACTION_TEXT = 0xFF111827.toInt()
internal val COLOR_ACCENT = 0xFF8EA2FF.toInt()
internal val COLOR_ACCENT_TEXT = 0xFF8EA2FF.toInt()
internal val COLOR_BORDER = 0xFF252C35.toInt()
internal val COLOR_OK = 0xFF8EA2FF.toInt()
internal val COLOR_INFO = 0xFFCDE5DB.toInt()
internal val COLOR_BAD = 0xFFF08D83.toInt()
internal val COLOR_OK_SOFT = 0xFF202A55.toInt()
internal val COLOR_BAD_SOFT = 0xFF3A1F22.toInt()
internal val COLOR_OK_BADGE = 0xFF202A55.toInt()
internal val COLOR_INFO_BADGE = 0xFF1B2026.toInt()
internal val COLOR_BAD_BADGE = 0xFF4A2529.toInt()
