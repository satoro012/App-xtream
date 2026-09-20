package com.meuiptv.plugin

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VideoPlayer")
class VideoPlayerPlugin : Plugin() {

    companion object {
        var instance: VideoPlayerPlugin? = null
    }

    override fun load() {
        instance = this
    }

    @PluginMethod
    fun playVideo(call: PluginCall) {
        val url = call.getString("url")
        if (url == null) {
            call.reject("URL is required")
            return
        }
        val title = call.getString("title") ?: "Reproduzindo"
        val isLive = call.getBoolean("isLive", false) ?: false
        val itemKey = call.getString("itemKey") ?: ""
        val startPositionMs = (call.getInt("startPositionMs", 0) ?: 0).toLong()

        val intent = Intent(context, VideoPlayerActivity::class.java)
        intent.putExtra("video_url", url)
        intent.putExtra("video_title", title)
        intent.putExtra("is_live", isLive)
        intent.putExtra("item_key", itemKey)
        intent.putExtra("start_position_ms", startPositionMs)
        activity.startActivity(intent)

        call.resolve(JSObject())
    }

    fun sendProgress(itemKey: String, positionMs: Long, durationMs: Long) {
        val data = JSObject()
        data.put("itemKey", itemKey)
        data.put("positionMs", positionMs)
        data.put("durationMs", durationMs)
        notifyListeners("progress", data)
    }

    fun sendEnded(itemKey: String) {
        val data = JSObject()
        data.put("itemKey", itemKey)
        notifyListeners("ended", data)
    }
}
