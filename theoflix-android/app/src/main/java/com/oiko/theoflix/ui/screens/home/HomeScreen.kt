package com.oiko.theoflix.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.TheoLevel
import com.oiko.theoflix.ui.theme.TheoFlixTheme
import com.google.firebase.auth.FirebaseAuth

@Composable
fun HomeScreen(
    onCourseClick: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val state by viewModel.state

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        when (val currentState = state) {
            is HomeState.Loading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            is HomeState.Error -> {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Erro: ${currentState.message}", color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                    Button(onClick = { viewModel.loadData() }, modifier = Modifier.padding(top = 16.dp)) {
                        Text("Tentar Novamente")
                    }
                }
            }
            is HomeState.Success -> {
                if (currentState.courses.isEmpty()) {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Nenhum curso encontrado no Firestore.", color = Color.Gray, textAlign = TextAlign.Center)
                        Text("Verifique a coleção 'theoflix_courses'.", style = MaterialTheme.typography.bodySmall, color = Color.DarkGray)
                        Button(onClick = { viewModel.loadData() }, modifier = Modifier.padding(top = 16.dp)) {
                            Text("Recarregar")
                        }
                    }
                } else {
                    val featuredCourse = currentState.courses.firstOrNull()
                    
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        item {
                            FeaturedHero(featuredCourse, onCourseClick)
                        }
                        items(currentState.levels) { level ->
                            val levelCourses = currentState.courses.filter { it.level == level.level }
                            if (levelCourses.isNotEmpty()) {
                                LevelSection(level, levelCourses, onCourseClick)
                                Spacer(modifier = Modifier.height(24.dp))
                            }
                        }
                        val matchedLevels = currentState.levels.map { it.level }.toSet()
                        val otherCourses = currentState.courses.filter { it.level !in matchedLevels }
                        if (otherCourses.isNotEmpty()) {
                            item {
                                LevelSection(
                                    level = TheoLevel(id = "outros", level = 99, title = "Cursos Eletivos e Diversos", color = "indigo"),
                                    courses = otherCourses,
                                    onCourseClick = onCourseClick
                                )
                                Spacer(modifier = Modifier.height(24.dp))
                            }
                        }
                        item {
                            Spacer(modifier = Modifier.height(80.dp))
                        }
                    }
                }

                // Translucent Top Bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Black.copy(alpha = 0.8f), Color.Transparent)
                            )
                        )
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "THEOFLIX",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 4.sp
                        )
                        IconButton(onClick = {
                            FirebaseAuth.getInstance().signOut()
                            onLogout()
                        }) {
                            Icon(Icons.Default.Info, contentDescription = "Sair", tint = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FeaturedHero(course: Course?, onCourseClick: (String) -> Unit) {
    if (course == null) return
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(500.dp)
            .clickable { onCourseClick(course.id) }
    ) {
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
                        colors = listOf(
                            Color.Transparent,
                            MaterialTheme.colorScheme.background.copy(alpha = 0.5f),
                            MaterialTheme.colorScheme.background
                        ),
                        startY = 300f
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "EM DESTAQUE",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp
            )
            Text(
                text = course.title.uppercase(),
                style = MaterialTheme.typography.titleLarge,
                fontSize = 42.sp,
                lineHeight = 44.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = { onCourseClick(course.id) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.height(36.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black)
                    Text("Assistir", color = Color.Black, fontWeight = FontWeight.Bold)
                }
                OutlinedButton(
                    onClick = { onCourseClick(course.id) },
                    border = null,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Icon(Icons.Default.Info, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Saiba mais", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun LevelSection(level: TheoLevel, courses: List<Course>, onCourseClick: (String) -> Unit) {
    Column(modifier = Modifier.padding(start = 16.dp)) {
        Text(
            text = level.title,
            style = MaterialTheme.typography.titleLarge,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(end = 16.dp)
        ) {
            items(courses) { course ->
                CourseCard(course, onCourseClick)
            }
        }
    }
}

@Composable
fun CourseCard(course: Course, onCourseClick: (String) -> Unit) {
    Column(
        modifier = Modifier
            .width(130.dp)
            .clickable { onCourseClick(course.id) }
    ) {
        Box {
            AsyncImage(
                model = course.image,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(4.dp)),
                contentScale = ContentScale.Crop
            )
            // Progress Bar simulation at the bottom of the poster if partially watched
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.6f) // Simulation of 60% progress
                    .height(3.dp)
                    .align(Alignment.BottomStart)
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
        Text(
            text = course.title,
            modifier = Modifier.padding(top = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = Color.LightGray,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF020617)
@Composable
fun HomePreview() {
    TheoFlixTheme {
        HomeScreen(onCourseClick = {}, onLogout = {})
    }
}
