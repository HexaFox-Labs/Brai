package world.brightos.brai.braicmd

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScreenshotButtonViewTest {
    @Test
    fun floatingButtonMarkerUsesOnlyFirstVisibleLetter() {
        assertEquals("", normalizeFloatingButtonMarker(null))
        assertEquals("", normalizeFloatingButtonMarker("   "))
        assertEquals("V", normalizeFloatingButtonMarker(" v"))
        assertEquals("D", normalizeFloatingButtonMarker(" dev"))
        assertEquals("A", normalizeFloatingButtonMarker("abc"))
    }

    @Test
    fun actionGlyphIsAlwaysPartOfTheRecordingAndUploadingLayers() {
        listOf(
            ContextButtonGlyph.Idea,
            ContextButtonGlyph.Image,
            ContextButtonGlyph.ImageMic,
            ContextButtonGlyph.Chat,
            ContextButtonGlyph.Save
        ).forEach { glyph -> assertTrue(shouldDrawContextActionGlyph(glyph)) }
    }

    @Test
    fun hubVisualsDoNotDrawAnExtraActionGlyph() {
        assertFalse(shouldDrawContextActionGlyph(ContextButtonGlyph.Logo))
        assertFalse(shouldDrawContextActionGlyph(ContextButtonGlyph.Close))
    }

    @Test
    fun successfulActionReplacesItsGlyphWithTheCleanCheckState() {
        assertFalse(shouldDrawContextActionGlyph(ContextButtonGlyph.Image, RecorderState.InboxDelivered()))
    }

    @Test
    fun queueBadgeShowsOnlyFailedOrReadyCountsAndPrioritizesReadyText() {
        assertEquals(
            QueueBadgeState(1, QueueBadgeTone.Ready),
            resolveQueueBadgeState(failedCount = 2, readyCount = 1)
        )
        assertEquals(
            QueueBadgeState(2, QueueBadgeTone.Ready),
            resolveQueueBadgeState(failedCount = 0, readyCount = 2)
        )
        assertEquals(
            QueueBadgeState(2, QueueBadgeTone.Failed),
            resolveQueueBadgeState(failedCount = 2, readyCount = 0)
        )
        assertNull(resolveQueueBadgeState(failedCount = 0, readyCount = 0))
    }
}
