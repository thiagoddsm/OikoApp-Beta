package com.oiko.theoflix.ui.screens.details

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.Episode
import com.oiko.theoflix.data.models.UserProgress
import com.oiko.theoflix.ui.theme.TheoFlixTheme

@Composable
fun CourseDetailScreen(
    courseId: String,
    onBack: () -> Unit,
    onPlayEpisode: (Episode) -> Unit,
    viewModel: CourseDetailViewModel = viewModel()
) {
    val state by viewModel.state

    LaunchedEffect(courseId) {
        viewModel.loadCourse(courseId)
    }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        when (val currentState = state) {
            is CourseDetailState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = MaterialTheme.colorScheme.primary
                )
            }
            is CourseDetailState.Error -> {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = currentState.message, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { viewModel.loadCourse(courseId) }) {
                        Text("Tentar Novamente")
                    }
                }
            }
            is CourseDetailState.Success -> {
                val course = currentState.course
                val progressMap = currentState.progressMap

                val completedCount = course.episodes.count { ep ->
                    val key = ep.youtubeId.ifEmpty { ep.title.replace(" ", "_") }
                    progressMap[key]?.completed == true || progressMap[ep.youtubeId]?.completed == true
                }
                val totalEpisodes = maxOf(1, course.episodes.size)
                val progressFraction = completedCount.toFloat() / totalEpisodes
                val nextEpisode = course.episodes.firstOrNull { ep ->
                    val key = ep.youtubeId.ifEmpty { ep.title.replace(" ", "_") }
                    progressMap[key]?.completed != true && progressMap[ep.youtubeId]?.completed != true
                } ?: course.episodes.firstOrNull()

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    item {
                        HeaderSection(
                            course = course,
                            completedCount = completedCount,
                            totalEpisodes = totalEpisodes,
                            progressFraction = progressFraction,
                            nextEpisode = nextEpisode,
                            onBack = onBack,
                            onPlayEpisode = onPlayEpisode
                        )
                    }
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "AULAS DO CURSO",
                                style = MaterialTheme.typography.titleLarge,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                            Text(
                                text = "$completedCount/$totalEpisodes concluídas",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    itemsIndexed(course.episodes) { index, episode ->
                        val epKey = episode.youtubeId.ifEmpty { episode.title.replace(" ", "_") }
                        val isCompleted = progressMap[epKey]?.completed == true ||
                                progressMap[episode.youtubeId]?.completed == true ||
                                progressMap[index.toString()]?.completed == true

                        EpisodeItem(
                            number = index + 1,
                            episode = episode,
                            courseImage = course.image,
                            isCompleted = isCompleted,
                            onPlayEpisode = onPlayEpisode
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(64.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun HeaderSection(
    course: Course,
    completedCount: Int,
    totalEpisodes: Int,
    progressFraction: Float,
    nextEpisode: Episode?,
    onBack: () -> Unit,
    onPlayEpisode: (Episode) -> Unit
) {
    Box(modifier = Modifier.fillMaxWidth()) {
        AsyncImage(
            model = course.image.ifEmpty { "https://picsum.photos/seed/${course.id}/1200/800" },
            contentDescription = null,
            modifier = Modifier.fillMaxWidth().height(480.dp),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(480.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.5f),
                            Color.Transparent,
                            MaterialTheme.colorScheme.background.copy(alpha = 0.85f),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
        )
        
        // Back Button
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .statusBarsPadding()
                .padding(top = 8.dp, start = 8.dp)
                .align(Alignment.TopStart)
                .background(Color.Black.copy(alpha = 0.5f), shape = RoundedCornerShape(8.dp))
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(end = 8.dp)
                ) {
                    Text(
                        text = course.type.uppercase(),
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                if (completedCount == totalEpisodes && totalEpisodes > 0) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF16A34A)
                    ) {
                        Text(
                            text = "🏆 CONCLUÍDO",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = course.title,
                style = MaterialTheme.typography.titleLarge,
                fontSize = 32.sp,
                lineHeight = 36.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Barra de Progresso do Aluno
            Column(modifier = Modifier.fillMaxWidth()) {
                LinearProgressIndicator(
                    progress = { progressFraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = Color.DarkGray
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$completedCount de $totalEpisodes aulas concluídas (${(progressFraction * 100).toInt()}%)",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.LightGray
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Botão de Ação Inteligente
            Button(
                onClick = { nextEpisode?.let { onPlayEpisode(it) } },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (completedCount == totalEpisodes) MaterialTheme.colorScheme.primary else Color.White
                )
            ) {
                val icon = if (completedCount == totalEpisodes) Icons.Default.Refresh else Icons.Default.PlayArrow
                val textColor = if (completedCount == totalEpisodes) Color.White else Color.Black
                val buttonText = when {
                    completedCount == 0 -> "Iniciar Curso"
                    completedCount == totalEpisodes -> "Rever Curso"
                    else -> "Continuar: ${nextEpisode?.title ?: "Próxima Aula"}"
                }

                Icon(icon, contentDescription = null, tint = textColor)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = buttonText,
                    color = textColor,
                    fontWeight = FontWeight.Black,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = course.desc,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.LightGray,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun EpisodeItem(
    number: Int,
    episode: Episode,
    courseImage: String,
    isCompleted: Boolean,
    onPlayEpisode: (Episode) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onPlayEpisode(episode) }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(130.dp)
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(6.dp))
        ) {
            AsyncImage(
                model = courseImage.ifEmpty { "https://picsum.photos/seed/${episode.youtubeId}/400/225" },
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = if (isCompleted) 0.5f else 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                if (isCompleted) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "Concluído",
                        tint = Color(0xFF22C55E),
                        modifier = Modifier.size(32.dp)
                    )
                } else {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "Reproduzir",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "$number. ${episode.title}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = if (isCompleted) Color(0xFF86EFAC) else Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = episode.duration.ifEmpty { "Vídeo" },
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                    fontSize = 12.sp
                )
                if (episode.quiz?.enabled == true) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "• Quiz ativo",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
