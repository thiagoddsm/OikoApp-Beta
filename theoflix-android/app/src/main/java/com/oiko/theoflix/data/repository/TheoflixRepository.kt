package com.oiko.theoflix.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
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

    suspend fun saveProgress(userId: String, courseId: String, episodeKey: String, progress: UserProgress) {
        try {
            val userRef = firestore.collection("users").document(userId)
            val fieldPath = "journey.theoflixProgress.$courseId.$episodeKey"
            userRef.update(fieldPath, progress).await()
        } catch (e: Exception) {
            // Handle error
        }
    }
}
