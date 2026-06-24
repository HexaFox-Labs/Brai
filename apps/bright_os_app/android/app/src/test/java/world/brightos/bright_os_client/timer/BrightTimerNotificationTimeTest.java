package world.brightos.bright_os_client.timer;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class BrightTimerNotificationTimeTest {
    @Test
    public void parsesUtcTimerStart() {
        assertEquals(1781999707000L, BrightTimerNotificationTime.startedAtMillis("2026-06-20T23:55:07.000Z", 42L));
        assertEquals(1781999707000L, BrightTimerNotificationTime.startedAtMillis("2026-06-20T23:55:07Z", 42L));
    }

    @Test
    public void fallsBackForInvalidTimestamp() {
        assertEquals(42L, BrightTimerNotificationTime.startedAtMillis("not-a-date", 42L));
    }
}
