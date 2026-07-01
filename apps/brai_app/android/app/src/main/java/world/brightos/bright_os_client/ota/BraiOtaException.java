package world.brightos.bright_os_client.ota;

final class BraiOtaException extends Exception {
    BraiOtaException(String message) {
        super(message);
    }

    BraiOtaException(String message, Throwable cause) {
        super(message, cause);
    }
}
