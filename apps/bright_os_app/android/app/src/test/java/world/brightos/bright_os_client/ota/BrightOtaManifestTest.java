package world.brightos.bright_os_client.ota;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.File;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class BrightOtaManifestTest {
    @Test
    public void validatesTrustedCompatibleManifest() throws Exception {
        BrightOtaManifest manifest = BrightOtaManifest.parse(validManifest());

        manifest.validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 1);

        assertTrue(manifest.isCompatibleWith(1));
        assertTrue(manifest.isNewerThan("0.0.1.0"));
    }

    @Test
    public void rejectsNewerApkRequirement() throws Exception {
        BrightOtaManifest manifest = BrightOtaManifest.parse(validManifest().replace("\"minApkVersionCode\":1", "\"minApkVersionCode\":2"));

        assertFalse(manifest.isCompatibleWith(1));
        assertThrows(
            BrightOtaException.class,
            () -> manifest.validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 1)
        );
    }

    @Test
    public void acceptsExactApkRequirement() throws Exception {
        BrightOtaManifest manifest = BrightOtaManifest.parse(validManifest().replace("\"maxApkVersionCode\":null", "\"maxApkVersionCode\":2"));

        manifest.validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 2);

        assertTrue(manifest.isCompatibleWith(2));
    }

    @Test
    public void rejectsApkAboveMaxRequirement() throws Exception {
        BrightOtaManifest manifest = BrightOtaManifest.parse(validManifest().replace("\"maxApkVersionCode\":null", "\"maxApkVersionCode\":1"));

        assertFalse(manifest.isCompatibleWith(2));
        assertThrows(
            BrightOtaException.class,
            () -> manifest.validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 2)
        );
    }

    @Test
    public void rejectsCrossOriginArchiveUrl() throws Exception {
        BrightOtaManifest manifest = BrightOtaManifest.parse(
            validManifest().replace(
                "https://app.brightos.world/mobile-update/bundles/0.0.1.1/bundle.zip",
                "https://evil.example.test/mobile-update/bundles/0.0.1.1/bundle.zip"
            )
        );

        BrightOtaException error = assertThrows(
            BrightOtaException.class,
            () -> manifest.validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 1)
        );
        assertTrue(error.getMessage().contains("archive_url_untrusted_host"));
    }

    @Test
    public void rejectsInvalidChecksumShape() {
        assertThrows(
            BrightOtaException.class,
            () -> BrightOtaManifest.parse(validManifest().replace("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "not-a-hash"))
                .validate(new URL("https://app.brightos.world/mobile-update/manifest.json"), 1)
        );
    }

    @Test
    public void rejectsArchiveChecksumMismatch() throws Exception {
        File archive = Files.createTempFile("bright-ota-checksum", ".zip").toFile();
        Files.write(archive.toPath(), "not the expected archive".getBytes(StandardCharsets.UTF_8));
        BrightOtaManifest manifest = BrightOtaManifest.parse(
            validManifest()
                .replace("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
                .replace("\"sizeBytes\":1234", "\"sizeBytes\":" + archive.length())
        );

        BrightOtaException error = assertThrows(
            BrightOtaException.class,
            () -> BrightOtaManager.verifyArchive(manifest, archive)
        );
        assertTrue(error.getMessage().contains("archive_checksum_mismatch"));
    }

    private static String validManifest() {
        return "{"
            + "\"schemaVersion\":1,"
            + "\"channel\":\"stable\","
            + "\"bundleVersion\":\"0.0.1.1\","
            + "\"publishedAt\":\"2026-06-15T00:00:00Z\","
            + "\"archiveUrl\":\"https://app.brightos.world/mobile-update/bundles/0.0.1.1/bundle.zip\","
            + "\"sha256\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\","
            + "\"sizeBytes\":1234,"
            + "\"entrypoint\":\"index.html\","
            + "\"minApkVersionCode\":1,"
            + "\"maxApkVersionCode\":null,"
            + "\"mandatory\":false"
            + "}";
    }
}
