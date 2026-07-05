package world.brightos.brai.braicmd

import org.json.JSONArray
import org.json.JSONObject

internal object TelegramContextNormalizer {
    fun matches(raw: JSONObject, page: JSONObject): Boolean {
        val appPackage = raw.optString("appPackage").ifBlank { page.optString("appPackage") }.lowercase()
        val appLabel = raw.optString("appLabel").ifBlank { page.optString("appLabel") }.lowercase()
        if (NON_TELEGRAM_PACKAGE_HINTS.any { appPackage.contains(it) }) return false
        if (TELEGRAM_PACKAGE_HINTS.any { appPackage.contains(it) } || appLabel.contains("telegram")) return true

        val score = ContextCommon.items(page).sumOf { item ->
            TELEGRAM_TEXT_HINTS.count { hint -> item.text.contains(hint, ignoreCase = true) }
        }
        return score >= 2
    }

    fun normalize(raw: JSONObject, page: JSONObject, base: JSONObject): JSONObject {
        val items = ContextCommon.items(page)
        val chatTitle = page.optString("title").ifBlank { raw.optString("recipientName") }
        val chat = JSONObject()
            .put("title", chatTitle)
            .put("kind", ContextCommon.chatKind(chatTitle, items))
        telegramStatus(chatTitle, items)?.let { chat.put("status", it) }
        if (items.any { it.text.contains("Без уведомлений", ignoreCase = true) }) chat.put("muted", true)
        ContextCommon.textAfter("Инфо", items)?.let { chat.put("bio", it) }
        ContextCommon.textAfter("Закреплённое сообщение", items)?.let { chat.put("pinnedMessage", it) }

        return base
            .put("chat", chat)
            .put("input", ContextCommon.input(items))
            .put("messages", telegramMessages(items))
    }

    private fun telegramMessages(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        val seen = linkedMapOf<String, JSONObject>()
        items.sortedBy { it.top }.forEach { item ->
            val message = parseTelegramMessage(item.text) ?: return@forEach
            val key = listOf(
                message.optString("direction"),
                message.optString("type"),
                message.optString("time"),
                message.optString("text"),
                message.optInt("durationSec", 0)
            ).joinToString("|")
            val existing = seen[key]
            if (existing == null) {
                message.put("sourceTop", item.top)
                seen[key] = message
            } else if (existing.optString("text").isBlank() && message.optString("text").isNotBlank()) {
                seen[key] = message.put("sourceTop", item.top)
            }
        }
        seen.values.forEach(out::put)
        return out
    }

    private fun parseTelegramMessage(text: String): JSONObject? {
        val match = TELEGRAM_MESSAGE_RE.find(text) ?: return null
        val body = match.groupValues[1].trim()
        val direction = if (match.groupValues[2] == "Отправлено") "out" else "in"
        val time = match.groupValues[3]
        val readState = match.groupValues.getOrNull(4).orEmpty()
        val type = telegramMessageType(body)
        val cleanText = telegramMessageText(body, type)
        return JSONObject()
            .put("direction", direction)
            .put("type", type)
            .put("time", time)
            .apply {
                if (cleanText.isNotBlank()) put("text", cleanText)
                durationSec(body)?.let { put("durationSec", it) }
                if (direction == "out" && readState.isNotBlank()) put("read", readState == "Прочитано")
            }
    }

    private fun telegramMessageType(body: String): String =
        when {
            body.startsWith("Голосовое сообщение") -> "voice"
            body.startsWith("Видеосообщение") -> "video"
            body.startsWith("Фотография") -> "photo"
            body.startsWith("Альбом") -> "album"
            body.contains("звонок", ignoreCase = true) || body.contains("вызов", ignoreCase = true) -> "call"
            else -> "text"
        }

    private fun telegramMessageText(body: String, type: String): String =
        when (type) {
            "voice", "video" -> ""
            "photo" -> body.removePrefix("Фотография").trim(' ', ',', '.')
            "album" -> body.removePrefix("Альбом").trim(' ', ',', '.')
            else -> body
        }

    private fun durationSec(text: String): Int? =
        DURATION_RE.find(text)?.groupValues?.getOrNull(1)?.toIntOrNull()

    private fun telegramStatus(chatTitle: String, items: List<ContextItem>): String? {
        val title = chatTitle.trim()
        val direct = items.firstOrNull { item ->
            item.text.startsWith("был(а)") || item.text.startsWith("в сети") || item.text.startsWith("печатает")
        }?.text
        if (!direct.isNullOrBlank()) return direct
        if (title.isBlank()) return null
        return items.firstNotNullOfOrNull { item ->
            if (!item.text.startsWith(title)) return@firstNotNullOfOrNull null
            ContextCommon.cleanStatus(item.text.removePrefix(title)).takeIf { it.isNotBlank() }
        }
    }

    private val TELEGRAM_MESSAGE_RE = Regex("""^(.*)\s(Отправлено|Получено) в (\d{1,2}:\d{2})(?:,\s*(Прочитано|Не прочитано))?.*$""")
    private val DURATION_RE = Regex("""(\d+)\s*сек""")
    private val TELEGRAM_PACKAGE_HINTS = listOf("telegram", "nekogram", "challegram", "tgx")
    private val NON_TELEGRAM_PACKAGE_HINTS = listOf("whatsapp")
    private val TELEGRAM_TEXT_HINTS = listOf(
        "Голосовое сообщение",
        "Записать голосовое сообщение",
        "Прикрепить медиа",
        "Эмодзи, стикеры",
        "Веб-вкладки",
        "Закреплённое сообщение",
        "Показать расшифровку звука",
        "Список закреплённых сообщений"
    )
}
