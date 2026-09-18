package com.meuiptv.plugin

import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.Player
import com.google.android.exoplayer2.ui.StyledPlayerView
import com.meuiptv.app.R

class VideoPlayerActivity : AppCompatActivity() {

    private var player: ExoPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_video_player)

        val videoUrl = intent.getStringExtra("video_url")
        if (videoUrl == null) {
            finish()
            return
        }
        val title = intent.getStringExtra("video_title") ?: "Reproduzindo"

        val playerView = findViewById<StyledPlayerView>(R.id.player_view)
        val titleView = findViewById<TextView>(R.id.player_title)
        val btnBack = findViewById<ImageButton>(R.id.btn_back)
        val loading = findViewById<ProgressBar>(R.id.loading)

        titleView.text = title
        btnBack.setOnClickListener { finish() }

        val exoPlayer = ExoPlayer.Builder(this).build()
        exoPlayer.setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
        exoPlayer.prepare()
        exoPlayer.play()
        playerView.player = exoPlayer
        player = exoPlayer

        exoPlayer.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                loading.visibility = if (state == Player.STATE_BUFFERING) android.view.View.VISIBLE else android.view.View.GONE
            }
        })

        playerView.setShutterBackgroundColor(Color.BLACK)
        playerView.useController = true
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }
}
