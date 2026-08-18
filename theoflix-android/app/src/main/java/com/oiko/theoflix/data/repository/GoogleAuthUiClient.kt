package com.oiko.theoflix.data.repository

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

class GoogleAuthUiClient(
    private val context: Context,
    private val repository: AuthRepository = AuthRepository()
) {
    private val credentialManager = CredentialManager.create(context)

    suspend fun signIn(): Result<Boolean> {
        return try {
            // Web Client ID configurado no Firebase Authentication
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId("989586605112-pl638euilgmaki5i1e5cuna6le80nu27.apps.googleusercontent.com")
                .setAutoSelectEnabled(true)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val result = credentialManager.getCredential(context, request)
            val credential = result.credential

            if (credential is androidx.credentials.CustomCredential && 
                credential.type == com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                
                val googleIdTokenCredential = com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.data)
                val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
                
                repository.signInWithCredential(firebaseCredential)
                Result.success(true)
            } else {
                Result.failure(Exception("Tipo de credencial inválido"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
