package com.meuiptv.plugin

import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VideoPlayer")
class VideoPlayerPlugin : Plugin() {

    @com.getcapacitor.annotation.ActivityResult
    fun playVideo(call: PluginCall) {
        val url = call.getString("url") ?: run {
            call.reject("URL is required")
            return
        }
        val title = call.getString("title") ?: "Reproduzindo"

        val intent = Intent(context, VideoPlayerActivity::class.java).apply {
            putExtra("video_url", url)
            putExtra("video_title", title)
        }
        startActivityForResult(call, intent, "handleVideoResult")
    }

    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.handleOnActivityResult(requestCode, resultCode, data)
        val savedCall = bridge?.savedCall
        if (requestCode == 1 && savedCall != null) {
            savedCall.resolve(JSObject())
        }
    }
}
