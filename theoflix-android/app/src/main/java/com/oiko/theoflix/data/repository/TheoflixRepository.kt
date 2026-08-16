package com.oiko.theoflix.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.TheoLevel
import com.oiko.theoflix.data.models.UserProgress
import kotlinx.coroutines.tasks.await

class TheoflixRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    suspend fun fetchLevels(): List<TheoLevel> {
        return try {
            firestore.collection("theoflix_levels")
                .orderBy("level", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(TheoLevel::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun fetchCourses(): List<Course> {
        return try {
            firestore.collection("theoflix_courses")
                .get()
                .await()
                .toObjects(Course::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun fetchCourseById(courseId: String): Course? {
        return try {
            val snap = firestore.collection("theoflix_courses").document(courseId).get().await()
            if (snap.exists()) snap.toObject(Course::class.java) else null
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

    /**
     * Grava o progresso no fieldPath exato esperado pelo portal web:
     * `journey.theoflixProgress.ID_CURSO.ID_AULA`
     */
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
                // Fallback com SetOptions.merge caso os mapas intermediarios nao existam no documento do usuario
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
