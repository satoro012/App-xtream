package com.meuiptv.plugin

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VideoPlayer")
class VideoPlayerPlugin : Plugin() {

    @PluginMethod
    fun playVideo(call: PluginCall) {
        val url = call.getString("url")
        if (url == null) {
            call.reject("URL is required")
            return
        }
        val title = call.getString("title") ?: "Reproduzindo"
        val isLive = call.getBoolean("isLive") ?: false

        val intent = Intent(context, VideoPlayerActivity::class.java)
        intent.putExtra("video_url", url)
        intent.putExtra("video_title", title)
        intent.putExtra("is_live", isLive)
        activity.startActivity(intent)

        call.resolve(JSObject())
    }
}
