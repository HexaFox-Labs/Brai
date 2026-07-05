package world.brightos.brai.airwhisper

import org.json.JSONArray
import org.json.JSONObject

internal data class ContextItem(
    val text: String,
    val kind: String,
    val className: String,
    val editable: Boolean,
    val clickable: Boolean,
    val top: Int
)

internal object ContextCommon {
    fun items(page: JSONObject): List<ContextItem> {
        val array = page.optJSONArray("items") ?: JSONArray()
        return (0 until array.length())
            .mapNotNull { array.optJSONObject(it) }
            .mapNotNull { item ->
                val text = item.optString("text").replace(WHITESPACE_RE, " ").trim()
                if (text.isBlank()) return@mapNotNull null
                val bounds = item.optJSONObject("bounds") ?: JSONObject()
                ContextItem(
                    text = text,
                    kind = item.optString("kind"),
                    className = item.optString("className"),
                    editable = item.optBoolean("editable", false),
                    clickable = item.optBoolean("clickable", false),
                    top = bounds.optInt("top", 0)
                )
            }
    }

    fun input(items: List<ContextItem>): JSONObject {
        val input = items.firstOrNull { it.editable }
        val text = input?.text.orEmpty()
        return JSONObject()
            .put("text", text)
            .put("empty", text.isBlank() || INPUT_PLACEHOLDERS.any { text.equals(it, ignoreCase = true) })
    }

    fun visibleText(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        val seen = linkedSetOf<String>()
        items
            .filter { !it.editable && !isJunkText(it.text) }
            .sortedBy { it.top }
            .forEach { item ->
                if (seen.add(item.text.lowercase())) out.put(item.text)
            }
        return out
    }

    fun allVisibleText(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        items.sortedBy { it.top }.forEach { out.put(it.text) }
        return out
    }

    fun allVisibleItems(items: List<ContextItem>): JSONArray {
        val out = JSONArray()
        items.sortedBy { it.top }.forEach { item ->
            out.put(
                JSONObject()
                    .put("text", item.text)
                    .put("kind", item.kind)
                    .put("className", item.className)
                    .put("editable", item.editable)
                    .put("clickable", item.clickable)
                    .put("top", item.top)
            )
        }
        return out
    }

    fun chatKind(title: String, items: List<ContextItem>): String {
        val lowerTitle = title.lowercase()
        val texts = items.map { it.text.lowercase() }
        return when {
            isPhone(title) -> "personal"
            lowerTitle.contains(" bot") || lowerTitle.endsWith("bot") || lowerTitle.contains("бот") -> "bot"
            texts.any { it.contains("подписчик") || it.contains("subscriber") || it.contains("канал") || it.contains("channel") } -> "channel"
            texts.any { it.contains("участник") || it.contains("member") || it.contains("participant") } -> "group"
            texts.any { it.startsWith("был(а)") || it.startsWith("в сети") || it.startsWith("печатает") } -> "personal"
            else -> "unknown"
        }
    }

    fun textAfter(label: String, items: List<ContextItem>): String? {
        val labelItem = items.firstOrNull { it.text == label } ?: return null
        return items
            .filter { it.top >= labelItem.top && it.text != label && !isJunkText(it.text) }
            .minByOrNull { it.top }
            ?.text
    }

    fun isPhone(text: String): Boolean = PHONE_RE.matches(text)

    fun cleanStatus(text: String): String =
        text.replace(",", " ")
            .replace("Без уведомлений", "")
            .replace(WHITESPACE_RE, " ")
            .trim()

    private fun isJunkText(text: String): Boolean =
        JUNK_TEXTS.any { text.equals(it, ignoreCase = true) }

    private val PHONE_RE = Regex("""^\+?\d[\d\s()\-]{6,}$""")
    private val WHITESPACE_RE = Regex("\\s+")
    private val INPUT_PLACEHOLDERS = setOf("Сообщение", "Message", "Введите сообщение", "Напишите сообщение")
    private val JUNK_TEXTS = setOf(
        "Назад",
        "Поиск",
        "Позвонить",
        "Дополнительные параметры",
        "Фотография профиля",
        "Эмодзи, стикеры и GIF",
        "Прикрепить медиа",
        "Записать голосовое сообщение",
        "Показать расшифровку звука",
        "Веб-вкладки",
        "Список закреплённых сообщений"
    )
}
