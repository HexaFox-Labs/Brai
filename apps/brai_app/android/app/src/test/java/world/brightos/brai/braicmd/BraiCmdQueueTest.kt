package world.brightos.brai.braicmd

import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class BraiCmdQueueTest {
    private val context get() = RuntimeEnvironment.getApplication()
    private val recordings get() = File(context.filesDir, "pending-recordings")

    @Before
    @After
    fun cleanQueue() {
        listOf(
            "pending-recordings",
            "pending-screenshot-inbox",
            "pending-transcripts",
            "failed-recordings",
            "failed-screenshot-inbox"
        ).forEach { File(context.filesDir, it).deleteRecursively() }
    }

    @Test
    fun snapshotCountsTransportByActionAndReadyTextByKind() {
        val actions = listOf(
            AudioQueueAction.MainDictation,
            AudioQueueAction.IdeaVoiceInbox,
            AudioQueueAction.ScreenshotVoiceInbox,
            AudioQueueAction.ChatContextInbox,
            AudioQueueAction.SaveContextInbox,
            AudioQueueAction.Unknown
        )
        recordings.mkdirs()
        actions.forEachIndexed { index, action ->
            val audio = recordings.resolve("audio-$index.m4a").apply { writeBytes(byteArrayOf(1)) }
            InboxPayloadStore.saveAction(audio, action)
        }
        val screenshot = File(context.cacheDir, "snapshot-${System.nanoTime()}.png").apply { writeBytes(byteArrayOf(1)) }
        requireNotNull(ScreenshotInboxStore.enqueue(context, screenshot))
        PendingTranscriptStore.add(context, "main", PendingTranscriptKind.MainDictation)
        PendingTranscriptStore.add(context, "reply", PendingTranscriptKind.ChatReply)

        val snapshot = BraiCmdQueue.snapshot(context)

        assertEquals(1, snapshot.transport.main)
        assertEquals(1, snapshot.transport.unknown)
        assertEquals(1, snapshot.transport[ContextButtonAction.IdeaVoiceInbox])
        assertEquals(1, snapshot.transport[ContextButtonAction.ScreenshotInbox])
        assertEquals(1, snapshot.transport[ContextButtonAction.ScreenshotVoiceInbox])
        assertEquals(1, snapshot.transport[ContextButtonAction.ChatContextInbox])
        assertEquals(1, snapshot.transport[ContextButtonAction.SaveContextInbox])
        assertEquals(7, snapshot.transport.total)
        assertEquals(1, snapshot.readyToInsert.mainDictation)
        assertEquals(1, snapshot.readyToInsert.chatReply)
    }

    @Test
    fun legacyAudioActionsAreInferredWithoutChangingDeliveredRows() {
        recordings.mkdirs()
        val main = audio("main")
        val idea = audio("idea").also { InboxPayloadStore.mark(it, AudioQueueStore.IDEA_PREFIX) }
        val screenshotVoice = audio("screenshot").also {
            InboxPayloadStore.mark(it)
            ScreenshotContextStore.save(it, File(context.cacheDir, "legacy-${System.nanoTime()}.png").apply { writeBytes(byteArrayOf(1)) })
        }
        val chat = audio("chat").also { InboxPayloadStore.mark(it, AudioQueueStore.CHAT_PREFIX) }
        val save = audio("save").also {
            InboxPayloadStore.mark(it)
            File("${it.absolutePath}.context.json").writeText("{}", Charsets.UTF_8)
        }
        val unknown = audio("unknown").also { InboxPayloadStore.mark(it) }

        assertEquals(AudioQueueAction.MainDictation, AudioQueueStore.action(main))
        assertEquals(AudioQueueAction.IdeaVoiceInbox, AudioQueueStore.action(idea))
        assertEquals("текст", inboxDeliveryText(AudioQueueStore.action(idea), AudioQueueStore.IDEA_PREFIX, "текст"))
        assertEquals(AudioQueueAction.ScreenshotVoiceInbox, AudioQueueStore.action(screenshotVoice))
        assertEquals(AudioQueueAction.ChatContextInbox, AudioQueueStore.action(chat))
        assertEquals(AudioQueueAction.SaveContextInbox, AudioQueueStore.action(save))
        assertEquals(AudioQueueAction.Unknown, AudioQueueStore.action(unknown))
    }

    @Test
    fun quarantineKeepsAudioAndEverySidecar() {
        recordings.mkdirs()
        val audio = audio("rejected")
        InboxPayloadStore.mark(audio, AudioQueueStore.CHAT_PREFIX)
        InboxPayloadStore.saveTranscript(audio, "transcript")
        InboxPayloadStore.saveAction(audio, AudioQueueAction.ChatContextInbox)
        File("${audio.absolutePath}.context.json").writeText("{}", Charsets.UTF_8)
        ScreenshotContextStore.save(
            audio,
            File(context.cacheDir, "quarantine-${System.nanoTime()}.png").apply { writeBytes(byteArrayOf(1)) }
        )

        assertTrue(AudioQueueStore.quarantine(context, audio))

        val quarantined = File(context.filesDir, "failed-recordings/rejected.m4a")
        assertFalse(audio.exists())
        assertTrue(quarantined.isFile)
        listOf(
            ".context.json",
            ".screenshot.png",
            ".inbox.txt",
            ".inbox-prefix.txt",
            ".inbox-action.txt"
        ).forEach { assertTrue(File("${quarantined.absolutePath}$it").isFile) }
    }

    @Test
    fun completingDeliveryRemovesAudioAndSidecarsTogether() {
        recordings.mkdirs()
        val audio = audio("delivered")
        InboxPayloadStore.mark(audio, AudioQueueStore.CHAT_PREFIX)
        InboxPayloadStore.saveTranscript(audio, "transcript")
        InboxPayloadStore.saveAction(audio, AudioQueueAction.ChatContextInbox)
        File("${audio.absolutePath}.context.json").writeText("{}", Charsets.UTF_8)

        assertTrue(AudioQueueStore.complete(audio))

        assertFalse(audio.exists())
        assertFalse(File("${audio.absolutePath}.done").exists())
        listOf(
            ".context.json",
            ".inbox.txt",
            ".inbox-prefix.txt",
            ".inbox-action.txt"
        ).forEach { assertFalse(File("${audio.absolutePath}$it").exists()) }
    }

    private fun audio(name: String): File =
        recordings.resolve("$name.m4a").apply { writeBytes(byteArrayOf(1)) }
}
