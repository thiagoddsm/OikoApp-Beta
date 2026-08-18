package com.oiko.theoflix.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.oiko.theoflix.ui.screens.details.CourseDetailScreen
import com.oiko.theoflix.ui.screens.home.HomeScreen
import com.oiko.theoflix.ui.screens.login.LoginScreen
import com.oiko.theoflix.ui.screens.player.PlayerScreen
import java.net.URLDecoder
import java.net.URLEncoder

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Search : Screen("search")
    object MyList : Screen("mylist")
    object Profile : Screen("profile")
    object CourseDetails : Screen("course_details/{courseId}") {
        fun createRoute(courseId: String) = "course_details/$courseId"
    }
    object Player : Screen("player/{courseId}/{episodeKey}/{videoId}") {
        fun createRoute(courseId: String, episodeKey: String, videoId: String): String {
            val safeCourseId = URLEncoder.encode(courseId.ifEmpty { "default" }, "UTF-8")
            val safeKey = URLEncoder.encode(episodeKey.ifEmpty { "ep" }, "UTF-8")
            val safeVideoId = URLEncoder.encode(videoId.ifEmpty { "video" }, "UTF-8")
            return "player/$safeCourseId/$safeKey/$safeVideoId"
        }
    }
}

@Composable
fun TheoFlixNavGraph(
    navController: NavHostController,
    startDestination: String = Screen.Login.route,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Login.route) {
            LoginScreen(onLoginSuccess = {
                navController.navigate(Screen.Home.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            })
        }
        composable(Screen.Home.route) {
            HomeScreen(
                onCourseClick = { courseId ->
                    navController.navigate(Screen.CourseDetails.createRoute(courseId))
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Search.route) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text("Search Screen", color = androidx.compose.ui.graphics.Color.White)
            }
        }
        composable(Screen.MyList.route) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text("My List Screen", color = androidx.compose.ui.graphics.Color.White)
            }
        }
        composable(Screen.Profile.route) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text("Profile Screen", color = androidx.compose.ui.graphics.Color.White)
            }
        }
        composable(Screen.CourseDetails.route) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            CourseDetailScreen(
                courseId = courseId,
                onBack = { navController.popBackStack() },
                onPlayEpisode = { episode ->
                    val epKey = episode.youtubeId.ifEmpty { episode.title.replace(" ", "_") }
                    navController.navigate(Screen.Player.createRoute(courseId, epKey, episode.youtubeId))
                }
            )
        }
        composable(Screen.Player.route) { backStackEntry ->
            val rawCourseId = backStackEntry.arguments?.getString("courseId") ?: ""
            val rawEpisodeKey = backStackEntry.arguments?.getString("episodeKey") ?: ""
            val rawVideoId = backStackEntry.arguments?.getString("videoId") ?: ""

            val courseId = try { URLDecoder.decode(rawCourseId, "UTF-8") } catch (e: Exception) { rawCourseId }
            val episodeKey = try { URLDecoder.decode(rawEpisodeKey, "UTF-8") } catch (e: Exception) { rawEpisodeKey }
            val videoId = try { URLDecoder.decode(rawVideoId, "UTF-8") } catch (e: Exception) { rawVideoId }

            PlayerScreen(
                courseId = courseId,
                episodeKey = episodeKey,
                videoId = videoId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
