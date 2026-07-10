package world.brightos.brai.braicmd

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class OverlayPendingRetryTest {
    @Before
    fun resetRetryState() {
        QueueRetryStore(RuntimeEnvironment.getApplication()).reset()
    }

    @Test
    fun retryDelayUsesCappedLadder() {
        assertEquals(15_000L, queueRetryDelayMillis(1))
        assertEquals(60_000L, queueRetryDelayMillis(2))
        assertEquals(5 * 60_000L, queueRetryDelayMillis(3))
        assertEquals(15 * 60_000L, queueRetryDelayMillis(4))
        assertEquals(60 * 60_000L, queueRetryDelayMillis(5))
        assertEquals(60 * 60_000L, queueRetryDelayMillis(99))
    }

    @Test
    fun retryAttemptAndBlockedStatePersist() {
        val context = RuntimeEnvironment.getApplication()
        val first = QueueRetryStore(context).recordTransient(1_000L)
        val second = QueueRetryStore(context).recordTransient(2_000L)

        assertEquals(1, first.failureCount)
        assertEquals(16_000L, first.nextRetryAtMillis)
        assertEquals(2, second.failureCount)
        assertEquals(62_000L, second.nextRetryAtMillis)

        QueueRetryStore(context).markBlocked()
        assertNull(QueueRetryStore(context).remainingDelayMillis(3_000L))

        QueueRetryStore(context).allowImmediate()
        assertEquals(0L, QueueRetryStore(context).remainingDelayMillis(3_000L))
    }
}
