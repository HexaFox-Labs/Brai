package world.brightos.brai.braicmd

import java.io.File

object ConversationContextStore {
    fun save(audioFile: File, context: VisibleConversationContext?) {
        val sidecar = sidecarFile(audioFile)
        if (context == null || !context.isReliable()) {
            sidecar.delete()
            return
        }
        runCatching {
            sidecar.writeText(context.toPrettyJson(), Charsets.UTF_8)
        }
    }

    fun read(audioFile: File): VisibleConversationContext? {
        val sidecar = sidecarFile(audioFile)
        if (!sidecar.isFile) return null
        return runCatching {
            VisibleConversationContext.fromJson(sidecar.readText(Charsets.UTF_8))
        }.getOrNull()
    }

    fun move(fromAudioFile: File, toAudioFile: File) {
        val from = sidecarFile(fromAudioFile)
        if (!from.exists()) return
        val to = sidecarFile(toAudioFile)
        if (from.renameTo(to)) return
        runCatching {
            from.copyTo(to, overwrite = true)
            from.delete()
        }
    }

    fun delete(audioFile: File) {
        sidecarFile(audioFile).delete()
    }

    private fun sidecarFile(audioFile: File): File =
        File("${audioFile.absolutePath}.context.json")
}
