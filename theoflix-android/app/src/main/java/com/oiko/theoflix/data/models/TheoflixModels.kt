package com.oiko.theoflix.data.models

import com.google.firebase.firestore.DocumentId

data class TheoLevel(
    @DocumentId val id: String = "",
    val level: Int = 0,
    val title: String = "",
    val color: String = "blue"
)

data class Episode(
    val title: String = "",
    val youtubeId: String = "",
    val duration: String = "",
    val quiz: Quiz? = null
)

data class Quiz(
    val enabled: Boolean = false,
    val questions: List<Question> = emptyList()
)

data class Question(
    val question: String = "",
    val type: String = "multiple", // multiple or essay
    val options: List<String> = emptyList(),
    val correctIndex: Int? = null,
    val aiActive: Boolean = false,
    val essayGabarito: String = ""
)

data class Course(
    @DocumentId val id: String = "",
    val title: String = "",
    val desc: String = "",
    val level: Int = 1,
    val image: String = "",
    val type: String = "Obrigatório",
    val episodes: List<Episode> = emptyList(),
    val requireEnrollment: Boolean = false
)

data class UserProgress(
    val completed: Boolean = false,
    val startedAt: String = "",
    val completedAt: String = "",
    val timeSpentSeconds: Long = 0,
    val watchedMinutes: Int = 0
)
