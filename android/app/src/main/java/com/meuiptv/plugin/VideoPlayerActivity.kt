package com.meuiptv.plugin

import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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
        ativarImersivo()

        val videoUrl = intent.getStringExtra("video_url")
        if (videoUrl == null) {
            finish()
            return
        }
        val title = intent.getStringExtra("video_title") ?: "Reproduzindo"
        val isLive = intent.getBooleanExtra("is_live", false)

        val playerView = findViewById<StyledPlayerView>(R.id.player_view)
        val titleView = findViewById<TextView>(R.id.player_title)
        val btnBack = findViewById<ImageButton>(R.id.btn_back)
        val loading = findViewById<ProgressBar>(R.id.loading)
        val topBar = findViewById<LinearLayout>(R.id.top_bar)

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
                loading.visibility = if (state == Player.STATE_BUFFERING) View.VISIBLE else View.GONE
            }
        })

        playerView.setShutterBackgroundColor(Color.BLACK)
        playerView.useController = true
        playerView.controllerShowTimeoutMs = 3000

        if (isLive) {
            playerView.findViewById<View>(com.google.android.exoplayer2.ui.R.id.exo_progress)?.visibility = View.GONE
            playerView.findViewById<View>(com.google.android.exoplayer2.ui.R.id.exo_position)?.visibility = View.GONE
            playerView.findViewById<View>(com.google.android.exoplayer2.ui.R.id.exo_duration)?.visibility = View.GONE
            playerView.setShowFastForwardButton(false)
            playerView.setShowRewindButton(false)
            playerView.setShowNextButton(false)
            playerView.setShowPreviousButton(false)
        }

        playerView.setControllerVisibilityListener(
            StyledPlayerView.ControllerVisibilityListener { visibility ->
                topBar.visibility = visibility
            }
        )
    }

    private fun ativarImersivo() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) ativarImersivo()
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }
}
