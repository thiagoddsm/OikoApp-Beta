#include "oiko_audio_engine.h"
#include <jni.h>
#include <string>
#include <cmath>
#include <android/log.h>
#include <algorithm>

#define LOG_TAG "OikoAudioEngine"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

OikoAudioEngine::OikoAudioEngine() {
}

OikoAudioEngine::~OikoAudioEngine() {
    stop();
    clearTracks();
}

bool OikoAudioEngine::start() {
    oboe::AudioStreamBuilder builder;
    builder.setCallback(this);
    builder.setPerformanceMode(oboe::PerformanceMode::LowLatency);
    builder.setSharingMode(oboe::SharingMode::Exclusive);
    builder.setFormat(oboe::AudioFormat::Float);
    builder.setChannelCount(2); // Estéreo
    builder.setSampleRate(48000);

    oboe::Result result = builder.openStream(mStream);
    if (result != oboe::Result::OK) {
        LOGE("Erro ao abrir stream Oboe: %s", oboe::convertToText(result));
        return false;
    }

    result = mStream->requestStart();
    if (result != oboe::Result::OK) {
        LOGE("Erro ao iniciar stream Oboe: %s", oboe::convertToText(result));
        mStream->close();
        return false;
    }

    LOGI("Stream Oboe iniciado. Rate: 48000Hz");
    mEngineActive = true;
    return true;
}

void OikoAudioEngine::stop() {
    mEngineActive = false;
    mIsPlaying = false;
    if (mStream) {
        mStream->stop();
        mStream->close();
        mStream.reset();
    }
    LOGI("Stream Oboe parado.");
}

void OikoAudioEngine::setVolume(float volume) {
    mGlobalVolume = volume;
}

void OikoAudioEngine::addTrack(const std::string &trackId, const float *data, int32_t totalSamples, int32_t channels, int32_t sampleRate) {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    
    removeTrack(trackId);

    AudioTrack track;
    track.trackId = trackId;
    track.channels = channels;
    track.sampleRate = sampleRate;
    track.totalFrames = totalSamples / channels;
    
    track.pcmData = new float[totalSamples];
    std::copy(data, data + totalSamples, track.pcmData);
    
    track.playhead = 0;
    track.volume = 1.0f;
    track.pan = 0.0f; // Centro padrão
    track.isMuted = false;
    track.isActive = true;

    mTracks.push_back(track);
    LOGI("Track adicionada: %s (%d frames, %d canais, %dHz)", 
         trackId.c_str(), track.totalFrames, channels, sampleRate);
}

void OikoAudioEngine::removeTrack(const std::string &trackId) {
    auto it = std::find_if(mTracks.begin(), mTracks.end(), [&](const AudioTrack &t) {
        return t.trackId == trackId;
    });

    if (it != mTracks.end()) {
        delete[] it->pcmData;
        mTracks.erase(it);
        LOGI("Track removida: %s", trackId.c_str());
    }
}

void OikoAudioEngine::clearTracks() {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    for (auto &track : mTracks) {
        delete[] track.pcmData;
    }
    mTracks.clear();
    mGlobalPlayhead = 0;
    LOGI("Todas as tracks limpas.");
}

void OikoAudioEngine::setTrackVolume(const std::string &trackId, float volume) {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    for (auto &track : mTracks) {
        if (track.trackId == trackId) {
            track.volume = std::max(0.0f, std::min(1.0f, volume));
            break;
        }
    }
}

void OikoAudioEngine::setTrackPan(const std::string &trackId, float pan) {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    for (auto &track : mTracks) {
        if (track.trackId == trackId) {
            track.pan = std::max(-1.0f, std::min(1.0f, pan));
            break;
        }
    }
}

void OikoAudioEngine::setTrackMute(const std::string &trackId, bool mute) {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    for (auto &track : mTracks) {
        if (track.trackId == trackId) {
            track.isMuted = mute;
            break;
        }
    }
}

void OikoAudioEngine::play() {
    mIsPlaying = true;
    LOGI("Play pressionado.");
}

void OikoAudioEngine::pause() {
    mIsPlaying = false;
    LOGI("Pause pressionado.");
}

void OikoAudioEngine::seekToFrame(int32_t frame) {
    std::lock_guard<std::mutex> lock(mTracksMutex);
    mGlobalPlayhead = frame;
}

// --- MIXER COM SUPORTE A RESAMPLER E PAN ---
oboe::DataCallbackResult OikoAudioEngine::onAudioReady(oboe::AudioStream *oboeStream, void *audioData, int32_t numFrames) {
    float *output = static_cast<float*>(audioData);
    std::fill(output, output + (numFrames * 2), 0.0f);

    if (!mEngineActive) return oboe::DataCallbackResult::Stop;
    if (!mIsPlaying) return oboe::DataCallbackResult::Continue;

    bool activeTracks = false;

    if (mTracksMutex.try_lock()) {
        for (int frame = 0; frame < numFrames; ++frame) {
            float mixedL = 0.0f;
            float mixedR = 0.0f;
            
            // Cursor global ajustado para a amostragem nativa da track
            int32_t currentFrameGlobal = mGlobalPlayhead + frame;

            for (auto &track : mTracks) {
                if (!track.isActive || track.isMuted || track.pcmData == nullptr) {
                    continue;
                }

                // Resampler por interpolação de passo: converte o playhead global de 48000Hz para a taxa do arquivo
                int32_t trackFrame = (static_cast<int64_t>(currentFrameGlobal) * track.sampleRate) / 48000;

                if (trackFrame >= track.totalFrames) {
                    continue;
                }

                activeTracks = true;

                // Coeficientes de Pan linear constante
                float panL = (1.0f - track.pan) / 2.0f;
                float panR = (1.0f + track.pan) / 2.0f;
                
                float sampleL = 0.0f;
                float sampleR = 0.0f;

                if (track.channels == 2) {
                    sampleL = track.pcmData[trackFrame * 2] * track.volume;
                    sampleR = track.pcmData[trackFrame * 2 + 1] * track.volume;
                } else {
                    float sample = track.pcmData[trackFrame] * track.volume;
                    sampleL = sample;
                    sampleR = sample;
                }

                // Aplica o Pan a cada sinal
                mixedL += sampleL * panL;
                mixedR += sampleR * panR;
            }

            output[frame * 2] = mixedL * mGlobalVolume;
            output[frame * 2 + 1] = mixedR * mGlobalVolume;
        }

        mGlobalPlayhead += numFrames;
        mTracksMutex.unlock();
    }

    if (!activeTracks && mTracks.size() > 0 && mGlobalPlayhead > 100) {
        mIsPlaying = false;
        mGlobalPlayhead = 0;
        LOGI("Playback finalizado.");
    }

    return oboe::DataCallbackResult::Continue;
}

// --- Chamadas JNI ---

extern "C" {

static OikoAudioEngine *gEngineInstance = nullptr;

JNIEXPORT jboolean JNICALL
Java_com_example_oikolivespike_MainActivity_startEngine(JNIEnv *env, jobject thiz) {
    if (gEngineInstance == nullptr) {
        gEngineInstance = new OikoAudioEngine();
    }
    return gEngineInstance->start() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_stopEngine(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->stop();
        delete gEngineInstance;
        gEngineInstance = nullptr;
    }
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_setVolume(JNIEnv *env, jobject thiz, jfloat volume) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->setVolume(volume);
    }
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_playAudio(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->play();
    }
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_pauseAudio(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->pause();
    }
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_seekToFrame(JNIEnv *env, jobject thiz, jint frame) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->seekToFrame(frame);
    }
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_addAudioTrack(JNIEnv *env, jobject thiz, jstring track_id, jfloatArray data, jint total_samples, jint channels, jint sample_rate) {
    if (gEngineInstance == nullptr) return;

    const char *id_chars = env->GetStringUTFChars(track_id, nullptr);
    std::string id(id_chars);

    float *pcm_array = env->GetFloatArrayElements(data, nullptr);

    gEngineInstance->addTrack(id, pcm_array, total_samples, channels, sample_rate);

    env->ReleaseFloatArrayElements(data, pcm_array, JNI_ABORT);
    env->ReleaseStringUTFChars(track_id, id_chars);
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_setTrackVolume(JNIEnv *env, jobject thiz, jstring track_id, jfloat volume) {
    if (gEngineInstance == nullptr) return;
    const char *id_chars = env->GetStringUTFChars(track_id, nullptr);
    std::string id(id_chars);
    gEngineInstance->setTrackVolume(id, volume);
    env->ReleaseStringUTFChars(track_id, id_chars);
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_setTrackPan(JNIEnv *env, jobject thiz, jstring track_id, jfloat pan) {
    if (gEngineInstance == nullptr) return;
    const char *id_chars = env->GetStringUTFChars(track_id, nullptr);
    std::string id(id_chars);
    gEngineInstance->setTrackPan(id, pan);
    env->ReleaseStringUTFChars(track_id, id_chars);
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_setTrackMute(JNIEnv *env, jobject thiz, jstring track_id, jboolean mute) {
    if (gEngineInstance == nullptr) return;
    const char *id_chars = env->GetStringUTFChars(track_id, nullptr);
    std::string id(id_chars);
    gEngineInstance->setTrackMute(id, mute == JNI_TRUE);
    env->ReleaseStringUTFChars(track_id, id_chars);
}

JNIEXPORT void JNICALL
Java_com_example_oikolivespike_MainActivity_clearAllTracks(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        gEngineInstance->clearTracks();
    }
}

JNIEXPORT jint JNICALL
Java_com_example_oikolivespike_MainActivity_getCurrentPlaybackFrame(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        return gEngineInstance->getCurrentFrame();
    }
    return 0;
}

JNIEXPORT jboolean JNICALL
Java_com_example_oikolivespike_MainActivity_isAudioPlaying(JNIEnv *env, jobject thiz) {
    if (gEngineInstance != nullptr) {
        return gEngineInstance->isPlaying() ? JNI_TRUE : JNI_FALSE;
    }
    return JNI_FALSE;
}

}
