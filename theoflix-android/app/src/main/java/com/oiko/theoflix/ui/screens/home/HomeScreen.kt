package com.oiko.theoflix.ui.screens.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.TheoLevel

@Composable
fun HomeScreen(onCourseClick: (String) -> Unit) {
    // Mock para visualização inicial
    val levels = listOf(
        TheoLevel("1", 1, "Fundamentos", "blue"),
        TheoLevel("2", 2, "Maturidade", "rose")
    )
    
    val courses = listOf(
        Course("membros", "Curso de Membros", "Desc", 1, "https://picsum.photos/seed/membros/400/225"),
        Course("batismo", "Preparação para Batismo", "Desc", 1, "https://picsum.photos/seed/batismo/400/225"),
        Course("cura", "Cura Interior", "Desc", 2, "https://picsum.photos/seed/cura/400/225")
    )

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("THEOFLIX", fontWeight = FontWeight.Black, letterSpacing = 2.sp) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            items(levels) { level ->
                LevelSection(level, courses.filter { it.level == level.level }, onCourseClick)
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun LevelSection(level: TheoLevel, courses: List<Course>, onCourseClick: (String) -> Unit) {
    Column {
        Text(
            text = level.title.uppercase(),
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
            fontSize = 18.sp,
            modifier = Modifier.padding(bottom = 12.dp)
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(courses) { course ->
                CourseCard(course, onCourseClick)
            }
        }
    }
}

@Composable
fun CourseCard(course: Course, onCourseClick: (String) -> Unit) {
    Card(
        onClick = { onCourseClick(course.id) },
        modifier = Modifier.width(200.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column {
            AsyncImage(
                model = course.image,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f),
                contentScale = ContentScale.Crop
            )
            Text(
                text = course.title,
                modifier = Modifier.padding(8.dp),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
        }
    }
}
