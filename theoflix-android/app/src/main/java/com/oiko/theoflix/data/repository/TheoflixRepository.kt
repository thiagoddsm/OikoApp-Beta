package com.oiko.theoflix.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.Episode
import com.oiko.theoflix.data.models.TheoLevel
import com.oiko.theoflix.data.models.UserProgress
import kotlinx.coroutines.tasks.await

class TheoflixRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    // ── Catálogo Oficial OikoApp (theoflixDB) para paridade 100% com a Web ──
    private val defaultCourses = listOf(
        Course(
            id = "batismo",
            level = 1,
            title = "Batismo",
            type = "Obrigatório",
            image = "https://images.unsplash.com/photo-1510154221590-ff63e90a136f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            desc = "Fundamentação doutrinária para o início da caminhada pública com Cristo. Prepare-se para um mergulho profundo na fé.",
            requireEnrollment = true,
            episodes = listOf(
                Episode(title = "Salvação, Arrependimento e Fé Proporcional", youtubeId = "7wfYIMvS_9g", duration = "45min"),
                Episode(title = "O simbolismo bíblico do Batismo nas Águas", youtubeId = "7wfYIMvS_9g", duration = "50min"),
                Episode(title = "A Ceia do Senhor: Memória e Esperança", youtubeId = "7wfYIMvS_9g", duration = "40min"),
                Episode(title = "Introdução às Disciplinas Espirituais", youtubeId = "7wfYIMvS_9g", duration = "55min")
            )
        ),
        Course(
            id = "pertencer",
            level = 1,
            title = "Pertencer",
            type = "Obrigatório",
            image = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            desc = "Jornada de integração em 5 etapas fundamentais para se tornar parte do organismo da Igreja Batista da Manhã.",
            episodes = listOf(
                Episode(title = "Aula 1: Introdução & História da IBM", youtubeId = "7wfYIMvS_9g", duration = "20min"),
                Episode(title = "Aula 2: DNA Ministerial & Visão de Células", youtubeId = "7wfYIMvS_9g", duration = "25min"),
                Episode(title = "Aula 3: Mordomia Cristã & Finanças do Reino", youtubeId = "7wfYIMvS_9g", duration = "18min"),
                Episode(title = "Aula 4: Governança, Estatuto & Ética", youtubeId = "7wfYIMvS_9g", duration = "20min"),
                Episode(title = "Aula 5: Comissionamento & Compromisso", youtubeId = "7wfYIMvS_9g", duration = "23min")
            )
        ),
        Course(
            id = "crescer",
            level = 2,
            title = "Crescer",
            type = "Maturidade",
            image = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            desc = "Desenvolva sua maturidade cristã e entenda os princípios de uma vida frutífera no Reino de Deus.",
            episodes = listOf(
                Episode(title = "Aula 1: A Base da Maturidade Cristã", youtubeId = "7wfYIMvS_9g", duration = "55min"),
                Episode(title = "Aula 2: Vida no Espírito e Santificação", youtubeId = "7wfYIMvS_9g", duration = "60min"),
                Episode(title = "Aula 3: Caráter Cristão e o Fruto do Espírito", youtubeId = "7wfYIMvS_9g", duration = "50min"),
                Episode(title = "Aula 4: Mordomia dos Dons e Vocação", youtubeId = "7wfYIMvS_9g", duration = "65min"),
                Episode(title = "Aula 5: Vida de Oração e Intimidade", youtubeId = "7wfYIMvS_9g", duration = "45min"),
                Episode(title = "Aula 6: Autoridade Espiritual e Submissão", youtubeId = "7wfYIMvS_9g", duration = "50min")
            )
        ),
        Course(
            id = "cuidar",
            level = 2,
            title = "Cuidar",
            type = "Pastoreio",
            image = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            desc = "Capacitação para o cuidado relacional, discipulado de novos convertidos e pastoreio mútuo nas células.",
            episodes = listOf(
                Episode(title = "Aula 1: O Coração do Cuidador", youtubeId = "7wfYIMvS_9g", duration = "45min"),
                Episode(title = "Aula 2: Escuta Empática e Aconselhamento Bíblico", youtubeId = "7wfYIMvS_9g", duration = "50min")
            )
        ),
        Course(
            id = "liderar",
            level = 3,
            title = "Liderar",
            type = "Liderança",
            image = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            desc = "Formação avançada para líderes de células, supervisores de área e coordenadores ministeriais.",
            episodes = listOf(
                Episode(title = "Aula 1: A Visão da Liderança Servidora", youtubeId = "7wfYIMvS_9g", duration = "60min"),
                Episode(title = "Aula 2: Multiplicação de Líderes e GC", youtubeId = "7wfYIMvS_9g", duration = "55min")
            )
        )
    )

    private val defaultLevels = listOf(
        TheoLevel(id = "1", level = 1, title = "Fundamentos", color = "blue"),
        TheoLevel(id = "2", level = 2, title = "Consolidação", color = "rose"),
        TheoLevel(id = "3", level = 3, title = "Escola de Líderes", color = "amber"),
        TheoLevel(id = "4", level = 4, title = "Alta Gestão & Supervisão", color = "purple")
    )

    suspend fun fetchLevels(): List<TheoLevel> {
        return try {
            val dbLevels = firestore.collection("theoflix_levels")
                .orderBy("level", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(TheoLevel::class.java)
            if (dbLevels.isNotEmpty()) dbLevels else defaultLevels
        } catch (e: Exception) {
            defaultLevels
        }
    }

    suspend fun fetchCourses(): List<Course> {
        return try {
            val dbCourses = firestore.collection("theoflix_courses")
                .get()
                .await()
                .toObjects(Course::class.java)

            if (dbCourses.isEmpty()) return defaultCourses

            val dbIds = dbCourses.map { it.id }.toSet()
            val localFiltered = defaultCourses.filter { it.id !in dbIds }
            dbCourses + localFiltered
        } catch (e: Exception) {
            defaultCourses
        }
    }

    suspend fun fetchCourseById(courseId: String): Course? {
        return try {
            val snap = firestore.collection("theoflix_courses").document(courseId).get().await()
            if (snap.exists()) {
                snap.toObject(Course::class.java)
            } else {
                defaultCourses.firstOrNull { it.id.equals(courseId, ignoreCase = true) }
            }
        } catch (e: Exception) {
            defaultCourses.firstOrNull { it.id.equals(courseId, ignoreCase = true) }
        }
    }

    suspend fun fetchCourseProgress(userId: String, courseId: String): Map<String, UserProgress> {
        return try {
            val snap = firestore.collection("users").document(userId).get().await()
            val journey = snap.get("journey") as? Map<*, *>
            val theoflixProgress = journey?.get("theoflixProgress") as? Map<*, *>
            val courseProgress = theoflixProgress?.get(courseId) as? Map<*, *> ?: return emptyMap()

            val result = mutableMapOf<String, UserProgress>()
            for ((key, value) in courseProgress) {
                val keyStr = key?.toString() ?: continue
                val progressMap = value as? Map<*, *> ?: continue
                val completed = progressMap["completed"] as? Boolean ?: false
                val startedAt = progressMap["startedAt"]?.toString() ?: ""
                val completedAt = progressMap["completedAt"]?.toString() ?: ""
                val timeSpentSeconds = (progressMap["timeSpentSeconds"] as? Number)?.toLong() ?: 0L
                val watchedMinutes = (progressMap["watchedMinutes"] as? Number)?.toInt() ?: 0

                result[keyStr] = UserProgress(
                    completed = completed,
                    startedAt = startedAt,
                    completedAt = completedAt,
                    timeSpentSeconds = timeSpentSeconds,
                    watchedMinutes = watchedMinutes
                )
            }
            result
        } catch (e: Exception) {
            emptyMap()
        }
    }

    suspend fun saveProgress(userId: String, courseId: String, episodeKey: String, progress: UserProgress) {
        try {
            val userRef = firestore.collection("users").document(userId)
            val fieldPath = "journey.theoflixProgress.$courseId.$episodeKey"
            val progressMap = mapOf(
                "completed" to progress.completed,
                "startedAt" to progress.startedAt,
                "completedAt" to progress.completedAt,
                "timeSpentSeconds" to progress.timeSpentSeconds,
                "watchedMinutes" to progress.watchedMinutes
            )
            userRef.update(fieldPath, progressMap).await()
        } catch (e: Exception) {
            try {
                val userRef = firestore.collection("users").document(userId)
                val mergeMap = mapOf(
                    "journey" to mapOf(
                        "theoflixProgress" to mapOf(
                            courseId to mapOf(
                                episodeKey to mapOf(
                                    "completed" to progress.completed,
                                    "startedAt" to progress.startedAt,
                                    "completedAt" to progress.completedAt,
                                    "timeSpentSeconds" to progress.timeSpentSeconds,
                                    "watchedMinutes" to progress.watchedMinutes
                                )
                            )
                        )
                    )
                )
                userRef.set(mergeMap, SetOptions.merge()).await()
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }
}
