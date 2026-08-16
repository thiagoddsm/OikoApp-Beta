package com.oiko.theoflix.ui.screens.details

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.Episode

@Composable
fun CourseDetailScreen(courseId: String, onBack: () -> Unit, onPlayEpisode: (Episode) -> Unit) {
    // Mock
    val course = Course(
        id = courseId,
        title = "Curso de Membros",
        desc = "Entenda a visão, valores e como se integrar na igreja.",
        image = "https://picsum.photos/seed/membros/800/450",
        episodes = listOf(
            Episode("Boas Vindas", "abc", "10min"),
            Episode("Nossa Visão", "def", "45min"),
            Episode("Próximos Passos", "ghi", "30min")
        )
    )

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null, tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 16.dp)
        ) {
            item {
                HeaderSection(course)
            }
            item {
                Text(
                    text = "AULAS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(16.dp),
                    fontWeight = FontWeight.Black
                )
            }
            itemsIndexed(course.episodes) { index, episode ->
                EpisodeItem(index + 1, episode, onPlayEpisode)
            }
        }
    }
}

@Composable
fun HeaderSection(course: Course) {
    Box(modifier = Modifier.height(300.dp)) {
        AsyncImage(
            model = course.image,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, MaterialTheme.colorScheme.background),
                        startY = 100f
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                text = course.title,
                style = MaterialTheme.typography.titleLarge,
                fontSize = 32.sp,
                lineHeight = 36.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = course.desc,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.LightGray,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun EpisodeItem(number: Int, episode: Episode, onPlayEpisode: (Episode) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = number.toString().padStart(2, '0'),
            color = Color.DarkGray,
            fontWeight = FontWeight.Black,
            modifier = Modifier.width(32.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(episode.title, fontWeight = FontWeight.Bold, color = Color.White)
            Text(episode.duration, fontSize = 10.sp, color = Color.Gray)
        }
        IconButton(onClick = { onPlayEpisode(episode) }) {
            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        }
    }
}
