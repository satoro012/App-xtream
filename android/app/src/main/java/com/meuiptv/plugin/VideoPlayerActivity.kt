package com.meuiptv.plugin

import android.os.Bundle
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.ui.StyledPlayerView

class VideoPlayerActivity : AppCompatActivity() {

    private lateinit var playerView: StyledPlayerView
    private var player: ExoPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_video_player)

        val videoUrl = intent.getStringExtra("video_url") ?: return
        val title = intent.getStringExtra("video_title") ?: "Reproduzindo"

        playerView = findViewById(R.id.player_view)
        val titleView = findViewById<TextView>(R.id.player_title)
        val btnBack = findViewById<ImageButton>(R.id.btn_back)
        val loading = findViewById<ProgressBar>(R.id.loading)

        titleView.text = title
        btnBack.setOnClickListener { finish() }

        player = ExoPlayer.Builder(this).build().apply {
            setMediaItem(MediaItem.fromUri(android.net.Uri.parse(videoUrl)))
            prepare()
            play()
            playerView.player = this
        }

        playerView.setShutterBackgroundColor(android.graphics.Color.BLACK)
        playerView.useController = true
        playerView.controllerShowTimeoutMs = 5000
        playerView.controllerHideTimeoutMs = 5000
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }
}
