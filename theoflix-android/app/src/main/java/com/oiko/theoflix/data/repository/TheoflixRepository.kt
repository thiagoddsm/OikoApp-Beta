package com.oiko.theoflix.data.repository

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.Episode
import com.oiko.theoflix.data.models.Question
import com.oiko.theoflix.data.models.Quiz
import com.oiko.theoflix.data.models.TheoLevel
import com.oiko.theoflix.data.models.UserProgress
import kotlinx.coroutines.tasks.await

class TheoflixRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private fun parseEpisode(map: Map<*, *>): Episode {
        val title = map["title"]?.toString() ?: ""
        val youtubeId = map["youtubeId"]?.toString() ?: ""
        val duration = map["duration"]?.toString() ?: ""
        
        val quizMap = map["quiz"] as? Map<*, *>
        val quiz = if (quizMap != null) {
            val enabled = quizMap["enabled"] as? Boolean ?: false
            val rawQuestions = quizMap["questions"] as? List<*> ?: emptyList<Any>()
            val questions = rawQuestions.mapNotNull { q ->
                (q as? Map<*, *>)?.let { qMap ->
                    Question(
                        question = qMap["question"]?.toString() ?: "",
                        type = qMap["type"]?.toString() ?: "multiple",
                        options = (qMap["options"] as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList(),
                        correctIndex = (qMap["correctIndex"] as? Number)?.toInt(),
                        aiActive = qMap["aiActive"] as? Boolean ?: false,
                        essayGabarito = qMap["essayGabarito"]?.toString() ?: ""
                    )
                }
            }
            Quiz(enabled = enabled, questions = questions)
        } else null

        return Episode(
            title = title,
            youtubeId = youtubeId,
            duration = duration,
            quiz = quiz
        )
    }

    private fun mapDocToCourse(doc: DocumentSnapshot): Course {
        val rawEpisodes = doc.get("episodes") as? List<*> ?: emptyList<Any>()
        val episodes = rawEpisodes.mapNotNull { ep ->
            (ep as? Map<*, *>)?.let { parseEpisode(it) }
        }

        val levelNum = (doc.get("level") as? Number)?.toInt() 
            ?: doc.getString("level")?.toIntOrNull() 
            ?: 1

        return Course(
            id = doc.id,
            title = doc.getString("title") ?: doc.getString("name") ?: "",
            desc = doc.getString("desc") ?: doc.getString("description") ?: "",
            level = levelNum,
            image = doc.getString("image") ?: doc.getString("imageUrl") ?: doc.getString("cover") ?: "",
            type = doc.getString("type") ?: "Obrigatório",
            episodes = episodes,
            requireEnrollment = doc.getBoolean("requireEnrollment") ?: false
        )
    }

    private fun mapDocToLevel(doc: DocumentSnapshot): TheoLevel {
        val levelNum = (doc.get("level") as? Number)?.toInt() 
            ?: doc.getString("level")?.toIntOrNull() 
            ?: (doc.id.toIntOrNull() ?: 1)

        return TheoLevel(
            id = doc.id,
            level = levelNum,
            title = doc.getString("title") ?: doc.getString("name") ?: "Nível $levelNum",
            color = doc.getString("color") ?: "blue"
        )
    }

    suspend fun fetchLevels(): List<TheoLevel> {
        return try {
            val snapshot = firestore.collection("theoflix_levels")
                .get()
                .await()
            val list = snapshot.documents.map { mapDocToLevel(it) }.sortedBy { it.level }
            if (list.isNotEmpty()) list else defaultLevels
        } catch (e: Exception) {
            defaultLevels
        }
    }

    suspend fun fetchCourses(): List<Course> {
        return try {
            val snapshot = firestore.collection("theoflix_courses")
                .get()
                .await()
            snapshot.documents.map { mapDocToCourse(it) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun fetchCourseById(courseId: String): Course? {
        return try {
            val doc = firestore.collection("theoflix_courses").document(courseId).get().await()
            if (doc.exists()) {
                mapDocToCourse(doc)
            } else {
                null
            }
        } catch (e: Exception) {
            null
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

    private val defaultLevels = listOf(
        TheoLevel(id = "1", level = 1, title = "Fundamentos", color = "blue"),
        TheoLevel(id = "2", level = 2, title = "Consolidação", color = "rose"),
        TheoLevel(id = "3", level = 3, title = "Escola de Líderes", color = "amber"),
        TheoLevel(id = "4", level = 4, title = "Alta Gestão & Supervisão", color = "purple")
    )
}
