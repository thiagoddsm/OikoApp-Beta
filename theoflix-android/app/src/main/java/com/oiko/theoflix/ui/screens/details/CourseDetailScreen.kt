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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.Episode
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

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    item {
                        HeaderSection(course, onBack, onPlayEpisode)
                    }
                    item {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "AULAS",
                                style = MaterialTheme.typography.titleLarge,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "${course.episodes.size} episódios",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.Gray
                            )
                        }
                    }
                    itemsIndexed(course.episodes) { index, episode ->
                        val isCompleted = progressMap[episode.youtubeId]?.completed == true ||
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
                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun HeaderSection(course: Course, onBack: () -> Unit, onPlayEpisode: (Episode) -> Unit) {
    Box(modifier = Modifier.fillMaxWidth()) {
        AsyncImage(
            model = course.image.ifEmpty { "https://picsum.photos/seed/${course.id}/1200/800" },
            contentDescription = null,
            modifier = Modifier.fillMaxWidth().height(450.dp),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(450.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.4f),
                            Color.Transparent,
                            MaterialTheme.colorScheme.background.copy(alpha = 0.8f),
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
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Text(
                    text = course.type.uppercase(),
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            Text(
                text = course.title,
                style = MaterialTheme.typography.titleLarge,
                fontSize = 36.sp,
                lineHeight = 40.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { course.episodes.firstOrNull()?.let { onPlayEpisode(it) } },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(4.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Assistir agora", color = Color.Black, fontWeight = FontWeight.Black)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = course.desc,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.LightGray,
                fontSize = 15.sp,
                lineHeight = 22.sp,
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
                .clip(RoundedCornerShape(4.dp))
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
                    .background(Color.Black.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                if (isCompleted) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "Concluído",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                } else {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "Assistir",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${number}. ${episode.title.ifEmpty { "Aula $number" }}",
                fontWeight = FontWeight.Bold,
                color = if (isCompleted) MaterialTheme.colorScheme.primary else Color.White,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = episode.duration,
                fontSize = 12.sp,
                color = Color.Gray,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun CourseDetailPreview() {
    TheoFlixTheme {
        CourseDetailScreen(courseId = "membros", onBack = {}, onPlayEpisode = {})
    }
}
