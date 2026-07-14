package com.studio.desk;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private FrameLayout splashOverlay;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. Set the WebView background to orange to prevent white flashes
        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#e36650"));

        // 2. Setup the Javascript Interface for dismissing the native splash
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void dismiss() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        dismissNativeOverlay();
                    }
                });
            }
        }, "AndroidLoadingOverlay");

        // 3. Create the native loading overlay programmatically
        createNativeOverlay();
    }

    private void createNativeOverlay() {
        // Create root layout covering the whole screen
        splashOverlay = new FrameLayout(this);
        splashOverlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        splashOverlay.setBackgroundColor(Color.parseColor("#e36650"));

        // Create the logo ImageView
        ImageView logoView = new ImageView(this);
        int logoId = getResources().getIdentifier("sla_logo", "drawable", getPackageName());
        if (logoId != 0) {
            logoView.setImageResource(logoId);
        }
        
        // Scale logo size (e.g. 150dp width/height or wrap content)
        int sizeInDp = 150;
        float scale = getResources().getDisplayMetrics().density;
        int sizeInPx = (int) (sizeInDp * scale + 0.5f);
        
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(sizeInPx, sizeInPx);
        logoParams.gravity = Gravity.CENTER;
        logoView.setLayoutParams(logoParams);
        logoView.setScaleType(ImageView.ScaleType.FIT_CENTER);

        splashOverlay.addView(logoView);

        // Add the overlay to the content view of the activity (on top of WebView)
        ViewGroup rootView = (ViewGroup) findViewById(android.R.id.content);
        rootView.addView(splashOverlay);

        // Add a pulsing animation to the logo
        ObjectAnimator pulseAnimator = ObjectAnimator.ofPropertyValuesHolder(
                logoView,
                PropertyValuesHolder.ofFloat("scaleX", 0.9f, 1.1f),
                PropertyValuesHolder.ofFloat("scaleY", 0.9f, 1.1f)
        );
        pulseAnimator.setDuration(1200);
        pulseAnimator.setRepeatCount(ValueAnimator.INFINITE);
        pulseAnimator.setRepeatMode(ValueAnimator.REVERSE);
        pulseAnimator.start();
    }

    private void dismissNativeOverlay() {
        if (splashOverlay != null && splashOverlay.getParent() != null) {
            splashOverlay.animate()
                .alpha(0f)
                .setDuration(400)
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        if (splashOverlay != null && splashOverlay.getParent() != null) {
                            ((ViewGroup) splashOverlay.getParent()).removeView(splashOverlay);
                            splashOverlay = null;
                        }
                    }
                });
        }
    }
}
