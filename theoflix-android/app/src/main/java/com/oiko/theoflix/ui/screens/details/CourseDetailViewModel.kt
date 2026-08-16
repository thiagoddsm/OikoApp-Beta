package com.oiko.theoflix.ui.screens.details

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.UserProgress
import com.oiko.theoflix.data.repository.AuthRepository
import com.oiko.theoflix.data.repository.TheoflixRepository
import kotlinx.coroutines.launch

sealed class CourseDetailState {
    object Loading : CourseDetailState()
    data class Success(
        val course: Course,
        val progressMap: Map<String, UserProgress>
    ) : CourseDetailState()
    data class Error(val message: String) : CourseDetailState()
}

class CourseDetailViewModel(
    private val repository: TheoflixRepository = TheoflixRepository(),
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _state = mutableStateOf<CourseDetailState>(CourseDetailState.Loading)
    val state: State<CourseDetailState> = _state

    fun loadCourse(courseId: String) {
        viewModelScope.launch {
            _state.value = CourseDetailState.Loading
            try {
                val course = repository.fetchCourseById(courseId)
                if (course == null) {
                    _state.value = CourseDetailState.Error("Curso não encontrado.")
                    return@launch
                }

                val userId = authRepository.currentUser?.uid
                val progressMap = if (userId != null) {
                    repository.fetchCourseProgress(userId, courseId)
                } else {
                    emptyMap()
                }

                _state.value = CourseDetailState.Success(course, progressMap)
            } catch (e: Exception) {
                _state.value = CourseDetailState.Error(e.message ?: "Erro ao carregar detalhes do curso.")
            }
        }
    }
}
