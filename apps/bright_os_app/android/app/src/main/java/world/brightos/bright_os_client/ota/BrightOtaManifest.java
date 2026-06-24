package world.brightos.bright_os_client.ota;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Locale;
import java.util.Map;

final class BrightOtaManifest {
    static final int SUPPORTED_SCHEMA_VERSION = 1;

    final int schemaVersion;
    final String channel;
    final String bundleVersion;
    final String publishedAt;
    final String archiveUrl;
    final String sha256;
    final long sizeBytes;
    final String entrypoint;
    final int minApkVersionCode;
    final Integer maxApkVersionCode;
    final boolean mandatory;

    private BrightOtaManifest(
        int schemaVersion,
        String channel,
        String bundleVersion,
        String publishedAt,
        String archiveUrl,
        String sha256,
        long sizeBytes,
        String entrypoint,
        int minApkVersionCode,
        Integer maxApkVersionCode,
        boolean mandatory
    ) {
        this.schemaVersion = schemaVersion;
        this.channel = channel;
        this.bundleVersion = bundleVersion;
        this.publishedAt = publishedAt;
        this.archiveUrl = archiveUrl;
        this.sha256 = sha256;
        this.sizeBytes = sizeBytes;
        this.entrypoint = entrypoint;
        this.minApkVersionCode = minApkVersionCode;
        this.maxApkVersionCode = maxApkVersionCode;
        this.mandatory = mandatory;
    }

    static BrightOtaManifest parse(String json) throws BrightOtaException {
        Map<String, Object> object = BrightOtaJson.parseObject(json);
        Integer maxApk = object.containsKey("maxApkVersionCode") && object.get("maxApkVersionCode") != null
            ? intValue(object, "maxApkVersionCode")
            : null;
        return new BrightOtaManifest(
            intValue(object, "schemaVersion"),
            requiredString(object, "channel"),
            requiredString(object, "bundleVersion"),
            requiredString(object, "publishedAt"),
            requiredString(object, "archiveUrl"),
            requiredString(object, "sha256").toLowerCase(Locale.ROOT),
            longValue(object, "sizeBytes"),
            requiredString(object, "entrypoint"),
            intValue(object, "minApkVersionCode"),
            maxApk,
            booleanValue(object, "mandatory")
        );
    }

    void validate(URL manifestUrl, int installedVersionCode) throws BrightOtaException {
        if (schemaVersion != SUPPORTED_SCHEMA_VERSION) {
            throw new BrightOtaException("unsupported_manifest_schema");
        }
        if (!"stable".equals(channel)) {
            throw new BrightOtaException("unsupported_channel");
        }
        if (!bundleVersion.matches("[A-Za-z0-9._+\\-]+")) {
            throw new BrightOtaException("invalid_bundle_version");
        }
        if (!sha256.matches("[0-9a-f]{64}")) {
            throw new BrightOtaException("invalid_sha256");
        }
        if (sizeBytes <= 0) {
            throw new BrightOtaException("invalid_size");
        }
        if (sizeBytes > BrightOtaArchive.MAX_ARCHIVE_BYTES) {
            throw new BrightOtaException("archive_too_large");
        }
        if (entrypoint.startsWith("/") || entrypoint.contains("..") || entrypoint.contains("\u0000")) {
            throw new BrightOtaException("invalid_entrypoint");
        }
        URL archive = archiveUrl();
        if (!"https".equalsIgnoreCase(archive.getProtocol())) {
            throw new BrightOtaException("archive_url_not_https");
        }
        if (archive.getUserInfo() != null) {
            throw new BrightOtaException("archive_url_has_userinfo");
        }
        if (!archive.getHost().equalsIgnoreCase(manifestUrl.getHost())) {
            throw new BrightOtaException("archive_url_untrusted_host");
        }
        if (!archive.getPath().startsWith("/mobile-update/")) {
            throw new BrightOtaException("archive_url_untrusted_path");
        }
        if (!isCompatibleWith(installedVersionCode)) {
            throw new BrightOtaException("bundle_incompatible");
        }
    }

    boolean isCompatibleWith(int installedVersionCode) {
        if (minApkVersionCode > installedVersionCode) return false;
        return maxApkVersionCode == null || installedVersionCode <= maxApkVersionCode;
    }

    boolean isNewerThan(String activeBundleVersion) {
        return BrightOtaVersion.compare(bundleVersion, activeBundleVersion) > 0;
    }

    URL archiveUrl() throws BrightOtaException {
        try {
            return new URL(archiveUrl);
        } catch (MalformedURLException error) {
            throw new BrightOtaException("archive_url_malformed", error);
        }
    }

    private static String requiredString(Map<String, Object> object, String key) throws BrightOtaException {
        Object raw = object.get(key);
        if (!(raw instanceof String)) {
            throw new BrightOtaException("manifest_missing_" + key);
        }
        String value = (String) raw;
        if (value == null || value.trim().isEmpty()) {
            throw new BrightOtaException("manifest_missing_" + key);
        }
        return value;
    }

    private static int intValue(Map<String, Object> object, String key) throws BrightOtaException {
        long value = longValue(object, key);
        if (value < Integer.MIN_VALUE || value > Integer.MAX_VALUE) {
            throw new BrightOtaException("manifest_invalid_" + key);
        }
        return (int) value;
    }

    private static long longValue(Map<String, Object> object, String key) throws BrightOtaException {
        Object raw = object.get(key);
        if (!(raw instanceof Long)) {
            throw new BrightOtaException("manifest_invalid_" + key);
        }
        return (Long) raw;
    }

    private static boolean booleanValue(Map<String, Object> object, String key) throws BrightOtaException {
        Object raw = object.get(key);
        if (!(raw instanceof Boolean)) {
            throw new BrightOtaException("manifest_invalid_" + key);
        }
        return (Boolean) raw;
    }
}
