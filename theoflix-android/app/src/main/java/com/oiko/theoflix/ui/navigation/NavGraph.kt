package com.oiko.theoflix.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.oiko.theoflix.ui.screens.details.CourseDetailScreen
import com.oiko.theoflix.ui.screens.home.HomeScreen

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object CourseDetails : Screen("course_details/{courseId}") {
        fun createRoute(courseId: String) = "course_details/$courseId"
    }
    object Player : Screen("player/{videoId}") {
        fun createRoute(videoId: String) = "player/$videoId"
    }
}

@Composable
fun TheoFlixNavGraph(navController: NavHostController) {
    NavHost(navController = navController, startDestination = Screen.Login.route) {
        composable(Screen.Login.route) {
            com.oiko.theoflix.ui.screens.login.LoginScreen(onLoginSuccess = {
                navController.navigate(Screen.Home.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            })
        }
        composable(Screen.Home.route) {
            HomeScreen(onCourseClick = { courseId ->
                navController.navigate(Screen.CourseDetails.createRoute(courseId))
            })
        }
        composable(Screen.CourseDetails.route) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            CourseDetailScreen(
                courseId = courseId,
                onBack = { navController.popBackStack() },
                onPlayEpisode = { episode ->
                    navController.navigate(Screen.Player.createRoute(episode.youtubeId))
                }
            )
        }
        composable(Screen.Player.route) { backStackEntry ->
            val videoId = backStackEntry.arguments?.getString("videoId") ?: ""
            com.oiko.theoflix.ui.screens.player.PlayerScreen(videoId = videoId, onBack = { navController.popBackStack() })
        }
    }
}
