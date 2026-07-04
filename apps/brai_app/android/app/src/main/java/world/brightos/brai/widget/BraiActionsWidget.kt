package world.brightos.brai.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import world.brightos.brai.R

class BraiActionsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BraiActionsWidget
}

object BraiActionsWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            BraiActionsWidgetContent()
        }
    }
}

@Composable
private fun BraiActionsWidgetContent() {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(R.color.brai_widget_background))
            .padding(14.dp)
    ) {
        Text(
            text = "Actions",
            style = TextStyle(
                color = ColorProvider(R.color.brai_widget_text),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Text(
            text = "Тестовый список",
            style = TextStyle(
                color = ColorProvider(R.color.brai_widget_muted),
                fontSize = 12.sp
            )
        )
        SAMPLE_ACTIONS.forEach { title ->
            Text(
                text = "- $title",
                style = TextStyle(
                    color = ColorProvider(R.color.brai_widget_text),
                    fontSize = 13.sp
                )
            )
        }
    }
}

private val SAMPLE_ACTIONS = listOf(
    "Разобрать входящие",
    "Запустить фокус",
    "Проверить Brai Cmd"
)
