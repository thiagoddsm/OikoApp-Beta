#ifndef OIKO_AUDIO_ENGINE_H
#define OIKO_AUDIO_ENGINE_H

#include <vector>
#include <string>
#include <mutex>
#include <oboe/Oboe.h>

// Estrutura que representa uma faixa de áudio decodificada na memória
struct AudioTrack {
    std::string trackId;
    float *pcmData = nullptr;
    int32_t totalFrames = 0; // Quantidade de frames (amostras por canal)
    int32_t channels = 2;
    int32_t sampleRate = 48000;
    
    // Controle de reprodução específico desta track
    int32_t playhead = 0;    // Posição atual de leitura
    float volume = 1.0f;     // Volume individual da track (0.0 a 1.0)
    float pan = 0.0f;        // Pan (-1.0f esquerda, 0.0f centro, 1.0f direita)
    bool isMuted = false;
    bool isSolo = false;
    bool isActive = false;   // Se a track está ativa no mixer atual
};

class OikoAudioEngine : public oboe::AudioStreamCallback {
public:
    OikoAudioEngine();
    virtual ~OikoAudioEngine();

    bool start();
    void stop();
    void setVolume(float volume);

    // Gerenciamento de buffers JNI (BufferManager)
    void addTrack(const std::string &trackId, const float *data, int32_t totalSamples, int32_t channels, int32_t sampleRate);
    void removeTrack(const std::string &trackId);
    void clearTracks();
    void setTrackVolume(const std::string &trackId, float volume);
    void setTrackPan(const std::string &trackId, float pan);
    void setTrackMute(const std::string &trackId, bool mute);
    
    // Controles de playback geral (TrackScheduler / Mixer)
    void play();
    void pause();
    void seekToFrame(int32_t frame);
    int32_t getCurrentFrame() const { return mGlobalPlayhead; }
    bool isPlaying() const { return mIsPlaying; }

    // Callback do Oboe para renderização
    oboe::DataCallbackResult onAudioReady(oboe::AudioStream *oboeStream, void *audioData, int32_t numFrames) override;

private:
    std::shared_ptr<oboe::AudioStream> mStream;
    std::vector<AudioTrack> mTracks;
    std::mutex mTracksMutex; // Mutex leve para escrita de tracks
    
    float mGlobalVolume = 0.8f;
    int32_t mGlobalPlayhead = 0; // Ponteiro global de leitura sincronizada
    
    bool mIsPlaying = false;
    bool mEngineActive = false;
};

#endif // OIKO_AUDIO_ENGINE_H
