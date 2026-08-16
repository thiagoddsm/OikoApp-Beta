package com.oiko.theoflix

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.oiko.theoflix.data.repository.AuthRepository
import com.oiko.theoflix.ui.navigation.Screen
import com.oiko.theoflix.ui.navigation.TheoFlixNavGraph
import com.oiko.theoflix.ui.theme.TheoFlixTheme

class MainActivity : ComponentActivity() {
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Sessão Persistente: se já estiver autenticado, inicia direto na Home
        val startDestination = if (authRepository.isUserLoggedIn()) {
            Screen.Home.route
        } else {
            Screen.Login.route
        }

        setContent {
            TheoFlixTheme {
                val navController = rememberNavController()
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Surface(
                        modifier = Modifier.fillMaxSize().padding(innerPadding),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        TheoFlixNavGraph(
                            navController = navController,
                            startDestination = startDestination
                        )
                    }
                }
            }
        }
    }
}
