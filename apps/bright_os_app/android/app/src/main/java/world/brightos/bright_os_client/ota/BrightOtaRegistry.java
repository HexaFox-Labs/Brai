package world.brightos.bright_os_client.ota;

public final class BrightOtaRegistry {
    private static BrightOtaManager manager;

    private BrightOtaRegistry() {}

    public static synchronized void setManager(BrightOtaManager nextManager) {
        manager = nextManager;
    }

    public static synchronized BrightOtaManager getManager() {
        return manager;
    }

    public static synchronized void clearManager(BrightOtaManager currentManager) {
        if (manager == currentManager) {
            manager = null;
        }
    }
}
