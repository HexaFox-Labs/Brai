package world.brightos.brai.braicmd

import android.content.Intent
import org.json.JSONObject

data class VisibleConversationContext(
    val recipientName: String,
    val appPackage: String,
    val appLabel: String,
    val confidence: Float,
    val source: String,
    val capturedAtMs: Long,
    val pageJson: String = ""
) {
    fun isReliable(): Boolean =
        (recipientName.isNotBlank() && confidence >= MIN_CONFIDENCE) || pageJson.isNotBlank()

    fun toJson(): JSONObject {
        val json = JSONObject()
            .put("recipientName", recipientName)
            .put("appPackage", appPackage)
            .put("appLabel", appLabel)
            .put("confidence", confidence.toDouble())
            .put("source", source)
            .put("capturedAtMs", capturedAtMs)
        pageObject()?.let { json.put("page", it) }
        return json
    }

    fun toPrettyJson(): String =
        toJson().toString(2)

    fun toNormalizedJson(): JSONObject =
        ContextNormalizer.normalize(toJson())

    private fun pageObject(): JSONObject? =
        runCatching { JSONObject(pageJson) }.getOrNull()

    companion object {
        const val MIN_CONFIDENCE = 0.65f

        private const val EXTRA_CONTEXT_JSON = "world.brightos.brai.braicmd.extra.VISIBLE_CONTEXT_JSON"

        fun putInto(intent: Intent, context: VisibleConversationContext?) {
            if (context == null || !context.isReliable()) return
            intent.putExtra(EXTRA_CONTEXT_JSON, context.toJson().toString())
        }

        fun fromIntent(intent: Intent?): VisibleConversationContext? {
            val raw = intent?.getStringExtra(EXTRA_CONTEXT_JSON).orEmpty()
            return raw.takeIf { it.isNotBlank() }?.let(::fromJson)
        }

        fun fromJson(raw: String): VisibleConversationContext? =
            runCatching {
                val json = JSONObject(raw)
                VisibleConversationContext(
                    recipientName = json.optString("recipientName").trim(),
                    appPackage = json.optString("appPackage"),
                    appLabel = json.optString("appLabel"),
                    confidence = json.optDouble("confidence", 0.0).toFloat(),
                    source = json.optString("source"),
                    capturedAtMs = json.optLong("capturedAtMs", 0L),
                    pageJson = json.optJSONObject("page")?.toString().orEmpty()
                ).takeIf { it.isReliable() }
            }.getOrNull()
    }
}
