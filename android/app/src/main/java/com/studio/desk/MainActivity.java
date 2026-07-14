package com.studio.desk;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The app loads from a remote Vercel URL. Before the page's CSS
        // arrives over the network, the WebView shows its own background.
        // Setting it to the brand orange makes every pre-content frame
        // consistent — no white or cream flash before splash.webp plays.
        getBridge().getWebView().setBackgroundColor(Color.parseColor("#e36650"));
    }
}
