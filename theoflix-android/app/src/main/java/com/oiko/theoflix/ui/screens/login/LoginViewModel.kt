package com.oiko.theoflix.ui.screens.login

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.oiko.theoflix.data.repository.AuthRepository
import kotlinx.coroutines.launch

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    object Success : LoginState()
    data class Error(val message: String) : LoginState()
}

class LoginViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _state = mutableStateOf<LoginState>(LoginState.Idle)
    val state: State<LoginState> = _state

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = LoginState.Error("Preencha todos os campos")
            return
        }

        viewModelScope.launch {
            _state.value = LoginState.Loading
            val result = repository.signIn(email, password)
            if (result.isSuccess) {
                _state.value = LoginState.Success
            } else {
                _state.value = LoginState.Error(result.exceptionOrNull()?.message ?: "Erro desconhecido")
            }
        }
    }

    fun onGoogleSignInResult(result: Result<Boolean>) {
        if (result.isSuccess) {
            _state.value = LoginState.Success
        } else {
            _state.value = LoginState.Error(result.exceptionOrNull()?.message ?: "Erro no Google Login")
        }
    }

    fun startLoading() {
        _state.value = LoginState.Loading
    }
}
