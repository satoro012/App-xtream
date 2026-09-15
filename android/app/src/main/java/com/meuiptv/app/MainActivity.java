package com.meuiptv.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.meuiptv.plugin.VideoPlayerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VideoPlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
