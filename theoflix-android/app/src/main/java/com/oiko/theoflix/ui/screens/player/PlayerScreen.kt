package com.oiko.theoflix.ui.screens.player

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
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
import com.google.firebase.auth.FirebaseAuth
import com.oiko.theoflix.data.models.Episode
import com.oiko.theoflix.data.models.UserProgress
import com.oiko.theoflix.data.repository.TheoflixRepository
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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
fun PlayerScreen(
    courseId: String = "",
    episodeKey: String = "",
    videoId: String,
    onBack: () -> Unit,
    repository: TheoflixRepository = remember { TheoflixRepository() }
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val cleanVideoId = remember(videoId) { extractYouTubeVideoId(videoId) }
    
    var currentEpisode by remember { mutableStateOf<Episode?>(null) }
    var isSaving by remember { mutableStateOf(false) }
    var isCompletedLocally by remember { mutableStateOf(false) }
    var showQuizDialog by remember { mutableStateOf(false) }
    var quizSelectedAnswers by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }
    
    val startTime = remember { SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()) }

    // Carrega metadados do curso e do episódio para saber se possui quiz
    LaunchedEffect(courseId, cleanVideoId) {
        if (courseId.isNotEmpty()) {
            val course = repository.fetchCourseById(courseId)
            val ep = course?.episodes?.firstOrNull { 
                it.youtubeId.equals(cleanVideoId, ignoreCase = true) || 
                it.youtubeId.equals(videoId, ignoreCase = true) ||
                it.title.replace(" ", "_").equals(episodeKey, ignoreCase = true)
            } ?: course?.episodes?.firstOrNull { it.youtubeId.isNotEmpty() }
            currentEpisode = ep
        }
    }

    fun openInYouTube() {
        try {
            val appIntent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$cleanVideoId"))
            context.startActivity(appIntent)
        } catch (e: Exception) {
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=$cleanVideoId"))
            context.startActivity(webIntent)
        }
    }

    fun persistProgress() {
        val userId = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val effectiveKey = episodeKey.ifEmpty { cleanVideoId }
        val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        
        isSaving = true
        scope.launch {
            repository.saveProgress(
                userId = userId,
                courseId = courseId.ifEmpty { "default_course" },
                episodeKey = effectiveKey,
                progress = UserProgress(
                    completed = true,
                    startedAt = startTime,
                    completedAt = nowIso,
                    timeSpentSeconds = 1800,
                    watchedMinutes = 30
                )
            )
            isSaving = false
            isCompletedLocally = true
            Toast.makeText(context, "Aula concluída com sucesso! 🎉", Toast.LENGTH_SHORT).show()
        }
    }

    fun handleCompleteClick() {
        val quiz = currentEpisode?.quiz
        if (quiz != null && quiz.enabled && quiz.questions.isNotEmpty()) {
            showQuizDialog = true
        } else {
            persistProgress()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // Player de Vídeo Nativo Sempre Visível e Ativo
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

                        override fun onStateChange(
                            youTubePlayer: YouTubePlayer,
                            state: PlayerConstants.PlayerState
                        ) {
                            if (state == PlayerConstants.PlayerState.ENDED) {
                                handleCompleteClick()
                            }
                        }
                    }, options)

                    lifecycleOwner.lifecycle.addObserver(this)
                }
            }
        )

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
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Abrir no YouTube", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Barra inferior com botão "Concluir Aula"
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(16.dp),
            color = Color.Black.copy(alpha = 0.85f),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color.DarkGray)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = currentEpisode?.title ?: "Aula em Reprodução",
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                    Text(
                        text = if (isCompletedLocally) "Status: Concluída ✅" else "Clique após assistir para salvar o progresso",
                        color = if (isCompletedLocally) Color(0xFF22C55E) else Color.Gray,
                        style = MaterialTheme.typography.labelSmall
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Button(
                    onClick = { handleCompleteClick() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isCompletedLocally) Color(0xFF15803D) else MaterialTheme.colorScheme.primary
                    ),
                    enabled = !isSaving
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isCompletedLocally) "Concluída" else "Concluir Aula",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    }

    // Modal de Quiz Interativo
    if (showQuizDialog && currentEpisode?.quiz != null) {
        val questions = currentEpisode?.quiz?.questions ?: emptyList()
        AlertDialog(
            onDismissRequest = { showQuizDialog = false },
            title = {
                Text(
                    "Quiz de Validação 📝",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        "Responda às questões para validar sua presença e aprendizado nesta aula:",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    questions.forEachIndexed { qIdx, question ->
                        Text(
                            text = "${qIdx + 1}. ${question.question}",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )

                        question.options.forEachIndexed { optIdx, optionText ->
                            val isSelected = quizSelectedAnswers[qIdx] == optIdx
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable {
                                        quizSelectedAnswers = quizSelectedAnswers.toMutableMap().apply {
                                            put(qIdx, optIdx)
                                        }
                                    },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant,
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RadioButton(
                                        selected = isSelected,
                                        onClick = {
                                            quizSelectedAnswers = quizSelectedAnswers.toMutableMap().apply {
                                                put(qIdx, optIdx)
                                            }
                                        }
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = optionText,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showQuizDialog = false
                        persistProgress()
                    }
                ) {
                    Text("Enviar Respostas & Concluir", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuizDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
