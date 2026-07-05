package world.brightos.brai.airwhisper

import android.content.Context
import java.io.File
import java.util.UUID

data class PendingTranscript(
    val file: File,
    val text: String
)

object PendingTranscriptStore {
    private const val TRANSCRIPTS_DIR = "pending-transcripts"

    fun add(context: Context, text: String): File {
        val dir = transcriptsDir(context).apply { mkdirs() }
        val file = File(dir, "airwhisper-${System.currentTimeMillis()}-${UUID.randomUUID()}.txt")
        file.writeText(text.trim(), Charsets.UTF_8)
        return file
    }

    fun list(context: Context): List<PendingTranscript> =
        transcriptsDir(context)
            .listFiles { file -> file.isFile && file.name.endsWith(".txt", ignoreCase = true) }
            ?.sortedBy { it.lastModified() }
            ?.mapNotNull { file ->
                val text = runCatching { file.readText(Charsets.UTF_8).trim() }.getOrDefault("")
                if (text.isBlank()) {
                    file.delete()
                    null
                } else {
                    PendingTranscript(file, text)
                }
            }
            .orEmpty()

    fun delete(transcript: PendingTranscript) {
        transcript.file.delete()
    }

    private fun transcriptsDir(context: Context): File =
        File(context.filesDir, TRANSCRIPTS_DIR)
}
