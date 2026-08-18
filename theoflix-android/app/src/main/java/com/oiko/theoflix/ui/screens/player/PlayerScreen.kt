package com.oiko.theoflix.ui.screens.player

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView

fun extractYouTubeVideoId(input: String): String {
    val trimmed = input.trim()
    if (trimmed.length == 11 && !trimmed.contains("/") && !trimmed.contains("?") && !trimmed.contains("=")) {
        return trimmed
    }
    val patterns = listOf(
        Regex("""(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})"""),
        Regex("""(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"""),
        Regex("""(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})"""),
        Regex("""(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})"""),
        Regex("""(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})""")
    )
    for (regex in patterns) {
        val match = regex.find(trimmed)
        if (match != null && match.groupValues.size > 1) {
            return match.groupValues[1]
        }
    }
    if (trimmed.contains("v=")) {
        val extracted = trimmed.substringAfter("v=").substringBefore("&").substringBefore("?")
        if (extracted.isNotEmpty()) return extracted
    }
    return trimmed
}

@Composable
fun PlayerScreen(videoId: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cleanVideoId = remember(videoId) { extractYouTubeVideoId(videoId) }
    var playbackError by remember { mutableStateOf<String?>(null) }

    fun openInYouTube() {
        try {
            val appIntent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$cleanVideoId"))
            context.startActivity(appIntent)
        } catch (e: Exception) {
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=$cleanVideoId"))
            context.startActivity(webIntent)
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        if (playbackError == null) {
            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .align(Alignment.Center),
                factory = { ctx ->
                    YouTubePlayerView(ctx).apply {
                        enableAutomaticInitialization = false
                        val options = IFramePlayerOptions.Builder()
                            .controls(1)
                            .fullscreen(1)
                            .autoplay(1)
                            .build()

                        initialize(object : AbstractYouTubePlayerListener() {
                            override fun onReady(youTubePlayer: YouTubePlayer) {
                                youTubePlayer.loadVideo(cleanVideoId, 0f)
                            }

                            override fun onError(
                                youTubePlayer: YouTubePlayer,
                                error: PlayerConstants.PlayerError
                            ) {
                                playbackError = "Erro $error: Este vídeo possui restrição de reprodução externa do YouTube."
                            }
                        }, options)

                        lifecycleOwner.lifecycle.addObserver(this)
                    }
                }
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp)
                    .align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Restrição de Reprodução do YouTube",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "O proprietário do vídeo ativou restrições de incorporação externa no YouTube ou o formato requer abertura direta.",
                    color = Color.LightGray,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { openInYouTube() },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Assistir no App do YouTube", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Top Bar com fechar e botão rápido do YouTube
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), shape = MaterialTheme.shapes.small)
            ) {
                Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Color.White)
            }

            TextButton(
                onClick = { openInYouTube() },
                modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), shape = MaterialTheme.shapes.small)
            ) {
                Text("Abrir no YouTube", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
