package com.oiko.theoflix.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Emerald500,
    background = Slate950,
    surface = Slate900,
    onPrimary = White,
    onBackground = White,
    onSurface = White,
    secondary = Slate800
)

@Composable
fun TheoFlixTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
