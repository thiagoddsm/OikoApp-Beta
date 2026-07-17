package com.example.oikolivespike

import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.example.oikolivespike.audio.PCMDecoder
import com.example.oikolivespike.audio.StemRepository
import com.example.oikolivespike.audio.StemTrack
import com.example.oikolivespike.audio.VsBundle
import com.example.oikolivespike.theme.OikoLiveSpikeTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class SelectedTrack(
    val id: String,
    val name: String,
    val uri: Uri? = null,
    var volume: Float = 1.0f,
    var pan: Float = 0.0f,
    var isMuted: Boolean = false,
    var isDecoded: Boolean = false
)

class MainActivity : ComponentActivity() {

    companion object {
        init {
            try {
                System.loadLibrary("oboe")
                System.loadLibrary("oiko_audio_engine")
            } catch (e: UnsatisfiedLinkError) {
                android.util.Log.e("MainActivity", "Erro ao carregar libs JNI: ${e.message}")
            }
        }
    }

    private external fun startEngine(): Boolean
    private external fun stopEngine()
    private external fun setVolume(volume: Float)
    private external fun playAudio()
    private external fun pauseAudio()
    private external fun seekToFrame(frame: Int)
    private external fun addAudioTrack(trackId: String, data: FloatArray, totalSamples: Int, channels: Int, sampleRate: Int)
    private external fun setTrackVolume(trackId: String, volume: Float)
    private external fun setTrackPan(trackId: String, pan: Float)
    private external fun setTrackMute(trackId: String, mute: Boolean)
    private external fun clearAllTracks()
    private external fun getCurrentPlaybackFrame(): Int
    private external fun isAudioPlaying(): Boolean

    private lateinit var decoder: PCMDecoder
    private lateinit var stemRepository: StemRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        decoder = PCMDecoder(this)
        stemRepository = StemRepository(this)
        startEngine()

        setContent {
            OikoLiveSpikeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    OikoLiveMixerScreen()
                }
            }
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun OikoLiveMixerScreen() {
        val context = LocalContext.current
        val tracksList = remember { mutableStateListOf<SelectedTrack>() }

        var isPlayingState by remember { mutableStateOf(false) }
        var masterVolume by remember { mutableFloatStateOf(0.8f) }
        var statusMessage by remember { mutableStateOf("") }
        var isLoading by remember { mutableStateOf(false) }
        var selectedSlotId by remember { mutableStateOf("") }

        // Estado da tela: "mixer" ou "catalog"
        var screen by remember { mutableStateOf("mixer") }
        var catalog by remember { mutableStateOf<List<VsBundle>>(emptyList()) }
        var isFetchingCatalog by remember { mutableStateOf(false) }

        // File picker manual
        val filePickerLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            if (uri != null && selectedSlotId.isNotEmpty()) {
                val fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "Áudio"
                decodeAndAddTrack(
                    trackId = selectedSlotId,
                    name = fileName,
                    uri = uri,
                    volume = 1.0f,
                    pan = 0.0f,
                    tracksList = tracksList,
                    onStatus = { statusMessage = it },
                    onLoading = { isLoading = it },
                    onError = { Toast.makeText(context, it, Toast.LENGTH_LONG).show() }
                )
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            if (screen == "catalog") "☁ Catálogo de VS" else "Oiko Live — Mixer",
                            fontWeight = FontWeight.Bold
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    actions = {
                        if (screen == "mixer") {
                            TextButton(onClick = {
                                screen = "catalog"
                                if (catalog.isEmpty()) {
                                    isFetchingCatalog = true
                                    lifecycleScope.launch {
                                        val result = withContext(Dispatchers.IO) { stemRepository.fetchCatalog() }
                                        catalog = result
                                        isFetchingCatalog = false
                                    }
                                }
                            }) {
                                Text("☁ Nuvem", color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        } else {
                            TextButton(onClick = { screen = "mixer" }) {
                                Text("← Mixer", color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }
                    }
                )
            }
        ) { paddingValues ->
            if (screen == "catalog") {
                // TELA DE CATÁLOGO DE VS
                CatalogScreen(
                    paddingValues = paddingValues,
                    catalog = catalog,
                    isFetching = isFetchingCatalog,
                    onSelectVs = { vs ->
                        screen = "mixer"
                        tracksList.clear()
                        clearAllTracks()
                        isPlayingState = false

                        // Baixa e decodifica todas as faixas da VS selecionada
                        lifecycleScope.launch {
                            vs.tracks.forEach { stem ->
                                statusMessage = "Baixando ${stem.label}..."
                                isLoading = true

                                val localFile = withContext(Dispatchers.IO) {
                                    stemRepository.downloadStem(stem, vs.id)
                                }

                                if (localFile != null) {
                                    statusMessage = "Decodificando ${stem.label}..."
                                    decodeAndAddTrack(
                                        trackId = stem.trackId,
                                        name = stem.label,
                                        uri = Uri.fromFile(localFile),
                                        volume = stem.defaultVolume,
                                        pan = stem.defaultPan,
                                        tracksList = tracksList,
                                        onStatus = { statusMessage = it },
                                        onLoading = { isLoading = it },
                                        onError = { Toast.makeText(context, it, Toast.LENGTH_SHORT).show() }
                                    )
                                } else {
                                    Toast.makeText(context, "Falha ao baixar ${stem.label}", Toast.LENGTH_SHORT).show()
                                }
                            }
                            statusMessage = "VS '${vs.title}' carregada! Pressione PLAY."
                            isLoading = false
                        }
                    }
                )
            } else {
                // TELA DO MIXER
                MixerScreen(
                    paddingValues = paddingValues,
                    tracksList = tracksList,
                    isLoading = isLoading,
                    statusMessage = statusMessage,
                    isPlaying = isPlayingState,
                    masterVolume = masterVolume,
                    onAddTrackManual = { slotId ->
                        selectedSlotId = slotId
                        filePickerLauncher.launch("audio/*")
                    },
                    onSetVolume = { trackId, vol ->
                        val i = tracksList.indexOfFirst { it.id == trackId }
                        if (i >= 0) { tracksList[i] = tracksList[i].copy(volume = vol); setTrackVolume(trackId, vol) }
                    },
                    onSetPan = { trackId, pan ->
                        val i = tracksList.indexOfFirst { it.id == trackId }
                        if (i >= 0) { tracksList[i] = tracksList[i].copy(pan = pan); setTrackPan(trackId, pan) }
                    },
                    onSetMute = { trackId, mute ->
                        val i = tracksList.indexOfFirst { it.id == trackId }
                        if (i >= 0) { tracksList[i] = tracksList[i].copy(isMuted = mute); setTrackMute(trackId, mute) }
                    },
                    onMasterVolume = { masterVolume = it; setVolume(it) },
                    onPlay = { playAudio(); isPlayingState = true },
                    onPause = { pauseAudio(); isPlayingState = false },
                    onStop = { pauseAudio(); seekToFrame(0); isPlayingState = false }
                )
            }
        }
    }

    // Decodifica e adiciona uma track ao mixer
    private fun decodeAndAddTrack(
        trackId: String,
        name: String,
        uri: Uri,
        volume: Float,
        pan: Float,
        tracksList: MutableList<SelectedTrack>,
        onStatus: (String) -> Unit,
        onLoading: (Boolean) -> Unit,
        onError: (String) -> Unit
    ) {
        tracksList.removeAll { it.id == trackId }
        tracksList.add(SelectedTrack(id = trackId, name = name, uri = uri, volume = volume, pan = pan))
        onStatus("Decodificando $name...")
        onLoading(true)

        lifecycleScope.launch(Dispatchers.Default) {
            val decoded = decoder.decodeFile(uri)
            withContext(Dispatchers.Main) {
                onLoading(false)
                if (decoded != null) {
                    addAudioTrack(trackId, decoded.pcmData, decoded.pcmData.size, decoded.channels, decoded.sampleRate)
                    setTrackVolume(trackId, volume)
                    setTrackPan(trackId, pan)
                    val i = tracksList.indexOfFirst { it.id == trackId }
                    if (i >= 0) tracksList[i] = tracksList[i].copy(isDecoded = true)
                    onStatus("$name pronta!")
                } else {
                    tracksList.removeAll { it.id == trackId }
                    onError("Erro ao decodificar $name")
                }
            }
        }
    }

    @Composable
    fun CatalogScreen(
        paddingValues: PaddingValues,
        catalog: List<VsBundle>,
        isFetching: Boolean,
        onSelectVs: (VsBundle) -> Unit
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp)
        ) {
            if (isFetching) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Buscando músicas na nuvem...")
                    }
                }
            } else if (catalog.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("📂", style = MaterialTheme.typography.displaySmall)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Nenhuma VS cadastrada ainda.")
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Cadastre músicas em vs_catalog no Firestore com as tracks e caminhos do Storage.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                    }
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(catalog) { vs ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                                .clickable { onSelectVs(vs) },
                            shape = RoundedCornerShape(12.dp),
                            elevation = CardDefaults.cardElevation(2.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("🎵", style = MaterialTheme.typography.headlineMedium)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(vs.title, fontWeight = FontWeight.Bold)
                                    if (vs.artist.isNotEmpty()) Text(vs.artist, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (vs.bpm > 0) Badge { Text("${vs.bpm} BPM") }
                                        if (vs.key.isNotEmpty()) Badge { Text(vs.key) }
                                        if (vs.tracks.isNotEmpty()) Badge { Text("${vs.tracks.size} faixas") }
                                    }
                                }
                                Text("▶", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        }
    }

    @Composable
    fun MixerScreen(
        paddingValues: PaddingValues,
        tracksList: List<SelectedTrack>,
        isLoading: Boolean,
        statusMessage: String,
        isPlaying: Boolean,
        masterVolume: Float,
        onAddTrackManual: (String) -> Unit,
        onSetVolume: (String, Float) -> Unit,
        onSetPan: (String, Float) -> Unit,
        onSetMute: (String, Boolean) -> Unit,
        onMasterVolume: (Float) -> Unit,
        onPlay: () -> Unit,
        onPause: () -> Unit,
        onStop: () -> Unit
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isLoading || statusMessage.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp))
                        if (isLoading) Spacer(modifier = Modifier.width(12.dp))
                        Text(statusMessage, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Text("Stems Manuais", style = MaterialTheme.typography.labelLarge, modifier = Modifier.align(Alignment.Start))
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("Clique" to "slot_click", "Guia" to "slot_guide", "VS/Música" to "slot_music").forEach { (label, slotId) ->
                    val has = tracksList.any { it.id == slotId && it.isDecoded }
                    Button(
                        onClick = { onAddTrackManual(slotId) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (has) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                        ),
                        modifier = Modifier.weight(1f).padding(horizontal = 3.dp)
                    ) { Text(if (has) "✓ $label" else "+ $label", style = MaterialTheme.typography.labelSmall) }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text("Canais Ativos", style = MaterialTheme.typography.labelLarge, modifier = Modifier.align(Alignment.Start))
            Spacer(modifier = Modifier.height(4.dp))

            if (tracksList.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text("Adicione faixas manualmente ou carregue uma VS ☁️ da nuvem.", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    items(tracksList) { track ->
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(track.name, fontWeight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.weight(1f))
                                    TextButton(onClick = { onSetMute(track.id, !track.isMuted) }) {
                                        Text(if (track.isMuted) "MUTADO" else "MUTE", color = if (track.isMuted) Color.Red else Color.Unspecified, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("VOL ${(track.volume * 100).toInt()}%", style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(60.dp))
                                    Slider(value = track.volume, onValueChange = { onSetVolume(track.id, it) }, valueRange = 0f..1f, modifier = Modifier.fillMaxWidth())
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    val panLabel = when {
                                        track.pan < -0.05f -> "L${(-track.pan * 100).toInt()}%"
                                        track.pan > 0.05f -> "R${(track.pan * 100).toInt()}%"
                                        else -> "C"
                                    }
                                    Text("PAN $panLabel", style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(60.dp))
                                    Slider(value = track.pan, onValueChange = { onSetPan(track.id, it) }, valueRange = -1f..1f, modifier = Modifier.fillMaxWidth())
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("MASTER", style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(55.dp))
                Slider(value = masterVolume, onValueChange = onMasterVolume, valueRange = 0f..1f, modifier = Modifier.fillMaxWidth())
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(onClick = onPlay, enabled = !isPlaying && tracksList.any { it.isDecoded }, modifier = Modifier.weight(1f).padding(horizontal = 4.dp)) { Text("▶ PLAY") }
                Button(onClick = onPause, enabled = isPlaying, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary), modifier = Modifier.weight(1f).padding(horizontal = 4.dp)) { Text("⏸ PAUSE") }
                Button(onClick = onStop, enabled = tracksList.isNotEmpty(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error), modifier = Modifier.weight(1f).padding(horizontal = 4.dp)) { Text("■ STOP") }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopEngine()
    }
}
