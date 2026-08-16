package com.oiko.theoflix.ui.screens.home

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.oiko.theoflix.data.models.Course
import com.oiko.theoflix.data.models.TheoLevel
import com.oiko.theoflix.data.repository.TheoflixRepository
import kotlinx.coroutines.launch

sealed class HomeState {
    object Loading : HomeState()
    data class Success(val levels: List<TheoLevel>, val courses: List<Course>) : HomeState()
    data class Error(val message: String) : HomeState()
}

class HomeViewModel(
    private val repository: TheoflixRepository = TheoflixRepository()
) : ViewModel() {

    private val _state = mutableStateOf<HomeState>(HomeState.Loading)
    val state: State<HomeState> = _state

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.value = HomeState.Loading
            try {
                val levels = repository.fetchLevels()
                val courses = repository.fetchCourses()
                _state.value = HomeState.Success(levels, courses)
            } catch (e: Exception) {
                _state.value = HomeState.Error(e.message ?: "Erro ao carregar dados")
            }
        }
    }
}
