package world.brightos.bright_os_client.ota;

final class BrightOtaException extends Exception {
    BrightOtaException(String message) {
        super(message);
    }

    BrightOtaException(String message, Throwable cause) {
        super(message, cause);
    }
}
