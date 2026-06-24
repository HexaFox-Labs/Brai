package world.brightos.bright_os_client;

import android.content.Intent;
import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.ServerPath;

import world.brightos.bright_os_client.ota.BrightOtaManager;
import world.brightos.bright_os_client.ota.BrightOtaPlugin;
import world.brightos.bright_os_client.ota.BrightOtaRegistry;
import world.brightos.bright_os_client.ota.BrightOtaWebViewClient;
import world.brightos.bright_os_client.timer.BrightTimerNotificationPlugin;
import world.brightos.bright_os_client.timer.BrightTimerNotificationService;

public class MainActivity extends BridgeActivity {
    private static final String HANDLE_ANDROID_BACK_SCRIPT =
        "(function(){try{return !!(window.BrightOsAndroidBack&&window.BrightOsAndroidBack());}catch(e){return false;}})();";
    private static final String HANDLE_TIMER_STOP_SCRIPT =
        "(function(){try{return !!(window.BrightOsAndroidTimerStop&&window.BrightOsAndroidTimerStop());}catch(e){return false;}})();";

    private BrightOtaManager otaManager;
    private OnBackPressedCallback androidBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        otaManager = new BrightOtaManager(this);
        BrightOtaRegistry.setManager(otaManager);

        ServerPath startupPath = otaManager.startupServerPath();
        if (startupPath != null) {
            bridgeBuilder.setServerPath(startupPath);
        }
        registerPlugin(BrightOtaPlugin.class);
        registerPlugin(BrightTimerNotificationPlugin.class);

        super.onCreate(savedInstanceState);

        androidBackCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleAndroidBack();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, androidBackCallback);

        otaManager.attachBridge(getBridge());
        getBridge().setWebViewClient(new BrightOtaWebViewClient(getBridge(), otaManager));
        otaManager.checkForUpdatesAsync();
        handleTimerNotificationIntent(getIntent());
    }

    @Override
    public void onDestroy() {
        if (otaManager != null) {
            BrightOtaRegistry.clearManager(otaManager);
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        handleAndroidBack();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleTimerNotificationIntent(intent);
    }

    private void handleAndroidBack() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            runDefaultBack();
            return;
        }

        getBridge().getWebView().evaluateJavascript(HANDLE_ANDROID_BACK_SCRIPT, handled -> {
            if (!"true".equals(handled)) {
                runDefaultBack();
            }
        });
    }

    private void runDefaultBack() {
        if (androidBackCallback == null) {
            super.onBackPressed();
            return;
        }

        try {
            androidBackCallback.setEnabled(false);
            getOnBackPressedDispatcher().onBackPressed();
        } finally {
            androidBackCallback.setEnabled(true);
        }
    }

    private void handleTimerNotificationIntent(Intent intent) {
        if (intent == null || !BrightTimerNotificationService.ACTION_REQUEST_STOP.equals(intent.getAction())) {
            return;
        }

        BrightTimerNotificationPlugin.requestStopFromNotification();
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        getBridge().getWebView().evaluateJavascript(HANDLE_TIMER_STOP_SCRIPT, handled -> {
            if ("true".equals(handled)) {
                BrightTimerNotificationPlugin.clearStopRequest();
            }
        });
    }
}
