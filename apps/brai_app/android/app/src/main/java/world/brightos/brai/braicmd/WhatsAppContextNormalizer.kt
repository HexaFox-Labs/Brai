package world.brightos.brai.braicmd

import org.json.JSONArray
import org.json.JSONObject

internal object WhatsAppContextNormalizer {
    fun matches(raw: JSONObject, page: JSONObject): Boolean {
        val appPackage = raw.optString("appPackage").ifBlank { page.optString("appPackage") }.lowercase()
        val appLabel = raw.optString("appLabel").ifBlank { page.optString("appLabel") }.lowercase()
        return appPackage.contains("whatsapp") || appLabel.contains("whatsapp")
    }

    fun normalize(raw: JSONObject, page: JSONObject, base: JSONObject): JSONObject {
        val items = ContextCommon.items(page)
        val visibleText = ContextCommon.visibleText(items)
        val title = whatsAppTitle(page, raw, visibleText)
        return base
            .put("chat", JSONObject().put("title", title).put("kind", ContextCommon.chatKind(title, items)))
            .put("input", ContextCommon.input(items))
            .put("messages", whatsAppMessages(items))
            .put("visibleText", whatsAppVisibleText(items))
    }

    private fun whatsAppTitle(page: JSONObject, raw: JSONObject, visibleText: JSONArray): String {
        val direct = page.optString("title").ifBlank { raw.optString("recipientName") }
        if (direct.isNotBlank() && !WHATSAPP_DATE_RE.matches(direct)) return direct
        for (index in 0 until visibleText.length()) {
            val text = visibleText.optString(index)
            if (ContextCommon.isPhone(text)) return text
        }
        return direct
    }

    private fun whatsAppMessages(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        var currentDate = ""
        var pendingText = ""
        items.sortedBy { it.top }.forEach { item ->
            val text = item.text.trim()
            when {
                text.isBlank() || isWhatsAppChrome(item) -> Unit
                WHATSAPP_DATE_RE.matches(text) -> currentDate = text
                WHATSAPP_TIME_RE.matches(text) -> {
                    if (pendingText.isNotBlank()) {
                        out.put(
                            JSONObject()
                                .put("direction", "unknown")
                                .put("type", whatsAppMessageType(pendingText))
                                .put("date", currentDate)
                                .put("time", text)
                                .put("text", pendingText)
                        )
                        pendingText = ""
                    }
                }
                text == "Прочитано" && out.length() > 0 -> out.optJSONObject(out.length() - 1)?.put("read", true)
                ContextCommon.isPhone(text) -> Unit
                else -> pendingText = text
            }
        }
        return out
    }

    private fun whatsAppVisibleText(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        val seen = linkedSetOf<String>()
        items
            .filter { !it.editable && !isWhatsAppChrome(it) }
            .sortedBy { it.top }
            .forEach { item ->
                if (seen.add(item.text.lowercase())) out.put(item.text)
            }
        return out
    }

    private fun whatsAppMessageType(text: String): String =
        when {
            text.contains("звонок", ignoreCase = true) || text.contains("вызов", ignoreCase = true) -> "call"
            text.contains("голосовое сообщение", ignoreCase = true) -> "voice"
            else -> "text"
        }

    private fun isWhatsAppChrome(item: ContextItem): Boolean =
        (WHATSAPP_CHROME_TEXTS.any { item.text.equals(it, ignoreCase = true) } && (item.clickable || item.top < TOOLBAR_BOTTOM_PX)) ||
            item.text.startsWith("Голосовое сообщение, кнопка", ignoreCase = true)

    private const val TOOLBAR_BOTTOM_PX = 220
    private val WHATSAPP_DATE_RE = Regex("""^(Сегодня|Вчера|\d{1,2}\s+\S+\s+\d{4}\s+г\.)$""")
    private val WHATSAPP_TIME_RE = Regex("""^\d{1,2}:\d{2}$""")
    private val WHATSAPP_CHROME_TEXTS = setOf(
        "Видеозвонок",
        "Аудиозвонок",
        "Другие параметры",
        "Смайлики, файлы GIF и стикеры",
        "Прикрепить",
        "Камера"
    )
}
