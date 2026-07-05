package world.brightos.brai.airwhisper

import org.json.JSONObject

object ContextNormalizer {
    fun normalize(raw: JSONObject): JSONObject {
        val page = raw.optJSONObject("page") ?: JSONObject()
        return when {
            TelegramContextNormalizer.matches(raw, page) ->
                TelegramContextNormalizer.normalize(raw, page, base(raw, page, "telegram", "telegram"))
            WhatsAppContextNormalizer.matches(raw, page) ->
                WhatsAppContextNormalizer.normalize(raw, page, base(raw, page, "whatsapp", "whatsapp"))
            else -> normalizeGeneric(raw, page)
        }
    }

    private fun normalizeGeneric(raw: JSONObject, page: JSONObject): JSONObject {
        val items = ContextCommon.items(page)
        return base(raw, page, "generic", genericMessenger(raw, page))
            .put("title", page.optString("title").ifBlank { raw.optString("recipientName") })
            .put("input", ContextCommon.input(items))
            .put("visibleText", ContextCommon.allVisibleText(items))
            .put("items", ContextCommon.allVisibleItems(items))
    }

    private fun base(raw: JSONObject, page: JSONObject, normalizer: String, messenger: String): JSONObject =
        JSONObject()
            .put("schema", "airwhisper.normalized_context.v1")
            .put("normalizer", normalizer)
            .put("messenger", messenger)
            .put("capturedAtMs", raw.optLong("capturedAtMs", page.optLong("capturedAtMs", 0L)))
            .put(
                "app",
                JSONObject()
                    .put("package", raw.optString("appPackage").ifBlank { page.optString("appPackage") })
                    .put("label", raw.optString("appLabel").ifBlank { page.optString("appLabel") })
            )
            .put("screen", page.optJSONObject("screen") ?: JSONObject())

    private fun genericMessenger(raw: JSONObject, page: JSONObject): String {
        val appPackage = raw.optString("appPackage").ifBlank { page.optString("appPackage") }.lowercase()
        if (appPackage.contains("whatsapp")) return "whatsapp"
        return "unknown"
    }
}
