package world.brightos.brai.braicmd

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScreenshotButtonViewTest {
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
}
