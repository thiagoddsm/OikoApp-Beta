package com.example.oikolivespike.audio

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.ktx.storage
import kotlinx.coroutines.tasks.await
import java.io.File

private const val TAG = "StemRepository"

// Metadados de uma faixa de stem no catálogo
data class StemTrack(
    val trackId: String,       // ex: "click", "guide", "backing"
    val label: String,         // ex: "Clique", "Guia", "Instrumental"
    val storagePath: String,   // ex: "vs/abc123/click.mp3"
    val defaultPan: Float = 0.0f,
    val defaultVolume: Float = 1.0f
)

// Metadados de um set de VS (Virtual Sound / Stems)
data class VsBundle(
    val id: String,
    val title: String,         // ex: "Oceans - Hillsong"
    val artist: String = "",
    val bpm: Int = 0,
    val timeSignature: String = "4/4",
    val key: String = "",
    val tracks: List<StemTrack> = emptyList()
)

class StemRepository(private val context: Context) {

    private val auth: FirebaseAuth = Firebase.auth
    private val firestore: FirebaseFirestore = Firebase.firestore
    private val storage: FirebaseStorage = Firebase.storage

    // Cache local no diretório do app (persiste entre execuções)
    private val cacheDir: File = File(context.cacheDir, "vs_stems")

    init {
        cacheDir.mkdirs()
    }

    // Autentica anonimamente (para poder acessar o Storage com as regras de segurança)
    suspend fun ensureAuthenticated() {
        try {
            if (auth.currentUser == null) {
                auth.signInAnonymously().await()
                Log.i(TAG, "Autenticação anônima realizada: ${auth.currentUser?.uid}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro na autenticação: ${e.message}")
        }
    }

    // Busca o catálogo de VS disponíveis no Firestore (coleção vs_catalog)
    suspend fun fetchCatalog(): List<VsBundle> {
        return try {
            ensureAuthenticated()
            val snapshot = firestore.collection("vs_catalog").get().await()
            snapshot.documents.mapNotNull { doc ->
                try {
                    val tracksRaw = doc.get("tracks") as? List<Map<String, Any>> ?: emptyList()
                    val tracks = tracksRaw.map { t ->
                        StemTrack(
                            trackId = t["trackId"] as? String ?: "",
                            label = t["label"] as? String ?: "",
                            storagePath = t["storagePath"] as? String ?: "",
                            defaultPan = (t["defaultPan"] as? Number)?.toFloat() ?: 0.0f,
                            defaultVolume = (t["defaultVolume"] as? Number)?.toFloat() ?: 1.0f
                        )
                    }
                    VsBundle(
                        id = doc.id,
                        title = doc.getString("title") ?: "Sem título",
                        artist = doc.getString("artist") ?: "",
                        bpm = (doc.getLong("bpm") ?: 0).toInt(),
                        timeSignature = doc.getString("timeSignature") ?: "4/4",
                        key = doc.getString("key") ?: "",
                        tracks = tracks
                    )
                } catch (e: Exception) {
                    Log.e(TAG, "Erro ao parsear VS ${doc.id}: ${e.message}")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao buscar catálogo: ${e.message}")
            emptyList()
        }
    }

    // Baixa um arquivo de stem do Firebase Storage para o cache local.
    // Retorna o File local se bem-sucedido, ou null em caso de erro.
    suspend fun downloadStem(stem: StemTrack, vsId: String, onProgress: (Float) -> Unit = {}): File? {
        val localFile = File(cacheDir, "${vsId}_${stem.trackId}.audio")

        // Se já está em cache local, usa direto sem baixar novamente
        if (localFile.exists() && localFile.length() > 0) {
            Log.i(TAG, "Cache hit: ${localFile.name}")
            return localFile
        }

        return try {
            ensureAuthenticated()
            val storageRef = storage.reference.child(stem.storagePath)
            
            // Baixa o arquivo para o cache local
            storageRef.getFile(localFile)
                .addOnProgressListener { snapshot ->
                    val progress = snapshot.bytesTransferred.toFloat() / snapshot.totalByteCount.toFloat()
                    onProgress(progress)
                }
                .await()

            Log.i(TAG, "Download concluído: ${localFile.name} (${localFile.length()} bytes)")
            localFile
        } catch (e: Exception) {
            Log.e(TAG, "Erro no download do stem ${stem.trackId}: ${e.message}")
            localFile.delete()
            null
        }
    }

    // Limpa o cache local de todos os stems baixados
    fun clearCache() {
        cacheDir.listFiles()?.forEach { it.delete() }
        Log.i(TAG, "Cache de stems limpo.")
    }
}
